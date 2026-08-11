import { prisma } from "@/lib/prisma";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";
import { getVerificationProvider } from "./index";
import type { VerificationResult } from "./types";

/**
 * Démarre une vérification 18+ pour l'annonceuse `providerId`. Crée un
 * VerificationRecord en base dans l'état renvoyé par le provider — pour le
 * mock, le résultat est déjà disponible (voir mock-provider.ts), mais le
 * service traite ce cas comme n'importe quel provider asynchrone : il
 * persiste d'abord l'état courant, `completeVerification` ira chercher le
 * résultat final séparément (c'est ce que ferait un webhook réel).
 */
export async function startVerification(providerId: string) {
  const provider = getVerificationProvider();
  const { externalVerificationId, redirectUrl } = await provider.startVerification({ providerId });

  const record = await prisma.verificationRecord.create({
    data: {
      providerId,
      verificationProvider: provider.name,
      externalVerificationId,
      status: "IN_PROGRESS",
      isAdult: null,
    },
  });

  return { verificationRecordId: record.id, redirectUrl };
}

/**
 * Va chercher le résultat courant chez le provider et met à jour le
 * VerificationRecord en conséquence. Pour un provider réel, c'est cette
 * fonction que la route de callback/webhook appelle (après vérification de
 * la signature du webhook, TODO à l'intégration du vrai provider) ; pour le
 * mock, elle peut être appelée immédiatement après `startVerification`.
 */
export async function completeVerification(verificationRecordId: string) {
  const existing = await prisma.verificationRecord.findUniqueOrThrow({
    where: { id: verificationRecordId },
  });

  const provider = getVerificationProvider();
  const result: VerificationResult = await provider.getResult(existing.externalVerificationId);

  const retentionPurgeAt = isTerminalStatus(result.status)
    ? await computePurgeAt(DATA_CATEGORIES.VERIFICATION_RECORD_AUDIT)
    : null;

  return prisma.verificationRecord.update({
    where: { id: verificationRecordId },
    data: {
      status: result.status,
      isAdult: result.isAdult,
      documentType: result.documentType,
      issuingCountry: result.issuingCountry,
      verifiedAt: result.verifiedAt,
      expiresAt: result.expiresAt,
      retentionPurgeAt,
    },
  });
}

function isTerminalStatus(status: VerificationResult["status"]): boolean {
  return status === "VERIFIED" || status === "FAILED" || status === "EXPIRED";
}

/**
 * Constraint #2 : un profil ne peut être publié que si sa dernière
 * vérification est VERIFIED, isAdult === true, et non expirée. Utilisé par
 * modules/moderation (une approbation de modérateur ne suffit jamais seule
 * à publier) et par modules/profiles au moment de la publication.
 */
export async function hasPassedAdultVerification(providerId: string): Promise<boolean> {
  const latest = await prisma.verificationRecord.findFirst({
    where: { providerId, status: "VERIFIED", isAdult: true },
    orderBy: { verifiedAt: "desc" },
  });
  if (!latest) return false;
  if (latest.expiresAt && latest.expiresAt < new Date()) return false;
  return true;
}
