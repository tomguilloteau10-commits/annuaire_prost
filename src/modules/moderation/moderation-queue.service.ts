import { prisma } from "@/lib/prisma";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";
import { recordAuditLog } from "./audit-log.service";
import type { ModerationDecision } from "@prisma/client";

/**
 * "La file de modération" n'est pas une table à part : c'est l'ensemble
 * des profils `PENDING_REVIEW` et des médias `PENDING`. Un profil/média
 * entre dedans simplement en existant avec ce statut (ENGINEERING_RULES.md
 * §7 : tout média et tout profil passe par une file avant publication —
 * il n'existe aucun chemin de code qui crée directement un profil
 * PUBLISHED ou un média APPROVED).
 */
export async function listPendingProfiles() {
  return prisma.providerProfile.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { updatedAt: "asc" },
    include: { city: true, category: true },
  });
}

export async function listPendingMedia() {
  return prisma.media.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

export class ModerationReasonRequiredError extends Error {
  constructor() {
    super("Une raison est obligatoire pour toute décision de modération");
    this.name = "ModerationReasonRequiredError";
  }
}

export class VerificationRequiredError extends Error {
  constructor() {
    super("Le profil ne peut pas être publié : vérification 18+ non passée ou expirée");
    this.name = "VerificationRequiredError";
  }
}

function assertReason(reason: string): void {
  if (!reason || reason.trim().length === 0) {
    throw new ModerationReasonRequiredError();
  }
}

export interface DecideOnProfileInput {
  profileId: string;
  moderatorId: string;
  decision: ModerationDecision;
  reason: string;
}

/**
 * Décision humaine sur un profil (ENGINEERING_RULES.md §7). Une
 * approbation ne suffit JAMAIS seule à publier (§2) : on revérifie ici
 * `hasPassedAdultVerification`, même si l'UI de modération ne devrait
 * normalement présenter que des profils déjà vérifiés — cette fonction ne
 * fait confiance ni à l'UI, ni à un appelant, ni à l'état affiché.
 */
export async function decideOnProfile({
  profileId,
  moderatorId,
  decision,
  reason,
}: DecideOnProfileInput) {
  assertReason(reason);

  const profile = await prisma.providerProfile.findUniqueOrThrow({ where: { id: profileId } });

  if (decision === "APPROVED") {
    const verified = await hasPassedAdultVerification(profile.userId);
    if (!verified) {
      throw new VerificationRequiredError();
    }
  }

  const updated = await prisma.providerProfile.update({
    where: { id: profileId },
    data:
      decision === "APPROVED"
        ? { status: "PUBLISHED", publishedAt: new Date() }
        : { status: "REJECTED" },
  });

  await prisma.moderationAction.create({
    data: { targetType: "PROFILE", targetId: profileId, decision, reason, moderatorId },
  });
  await recordAuditLog({
    actorId: moderatorId,
    action: decision === "APPROVED" ? "profile.publish" : "profile.reject",
    targetType: "PROFILE",
    targetId: profileId,
    metadata: { reason },
  });

  return updated;
}

export interface DecideOnMediaInput {
  mediaId: string;
  moderatorId: string;
  decision: ModerationDecision;
  reason: string;
}

export async function decideOnMedia({ mediaId, moderatorId, decision, reason }: DecideOnMediaInput) {
  assertReason(reason);

  const purgeAt =
    decision === "REJECTED" ? await computePurgeAt(DATA_CATEGORIES.MEDIA_REJECTED) : null;

  const updated = await prisma.media.update({
    where: { id: mediaId },
    data: {
      status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
      moderatedById: moderatorId,
      moderatedAt: new Date(),
      rejectionReason: decision === "REJECTED" ? reason : null,
      purgeAt,
    },
  });

  await prisma.moderationAction.create({
    data: { targetType: "MEDIA", targetId: mediaId, decision, reason, moderatorId },
  });
  await recordAuditLog({
    actorId: moderatorId,
    action: decision === "APPROVED" ? "media.approve" : "media.reject",
    targetType: "MEDIA",
    targetId: mediaId,
    metadata: { reason },
  });

  return updated;
}
