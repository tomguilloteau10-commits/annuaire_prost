import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";
import { recordAuditLog } from "@/modules/moderation/audit-log.service";
import { decideOnProfile } from "@/modules/moderation/moderation-queue.service";
import { decryptDocument, encryptDocument } from "./document-crypto";
import { MANUAL_REVIEW_PROVIDER, purgeExpiredVerificationDocuments } from "./document-retention";
import type { VerificationDocumentKind } from "@prisma/client";

/**
 * Vérification d'identité MANUELLE (ENGINEERING_RULES.md §1-§2).
 *
 * - La prestataire dépose ses pièces : elles sont chiffrées et stockées
 *   TEMPORAIREMENT (VerificationDocument), un VerificationRecord passe en
 *   PENDING. Rien n'est validé automatiquement.
 * - Seul un admin décide (Valider / Refuser avec motif). La décision
 *   supprime immédiatement les pièces : il ne reste que le résultat
 *   (vérifié oui/non, date, type de document, pays).
 * - Sans décision, les pièces sont supprimées au plus tard à `purgeAt`
 *   (purgeExpiredVerificationDocuments, appelée à l'ouverture des files
 *   admin et par scripts/purge-expired-data.ts).
 */

export { MANUAL_REVIEW_PROVIDER, purgeExpiredVerificationDocuments };
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_DOCUMENT_TYPES = ["image/png", "image/jpeg", "application/pdf"] as const;
export const IDENTITY_DOCUMENT_TYPES = ["id_card", "passport", "residence_permit", "driving_licence"] as const;
/** Durée de validité d'une vérification avant de la redemander. */
const VERIFICATION_VALIDITY_MS = 2 * 365 * 24 * 60 * 60 * 1000;

export class InvalidDocumentError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: "missing" | "format" | "too_large",
  ) {
    super(`Document invalide (${field}) : ${reason}`);
    this.name = "InvalidDocumentError";
  }
}

export interface UploadedDocument {
  buffer: Buffer;
  contentType: string;
}

/** Vérifie le format réel (octets de signature), pas seulement le type annoncé. */
function hasDocumentSignature({ buffer, contentType }: UploadedDocument): boolean {
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (contentType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

export function assertValidDocument(field: string, document: UploadedDocument | null): UploadedDocument {
  if (!document || document.buffer.length === 0) throw new InvalidDocumentError(field, "missing");
  if (document.buffer.length > MAX_DOCUMENT_BYTES) throw new InvalidDocumentError(field, "too_large");
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(document.contentType) || !hasDocumentSignature(document)) {
    throw new InvalidDocumentError(field, "format");
  }
  return document;
}

async function storeDocuments(
  providerId: string,
  documents: { kind: VerificationDocumentKind; document: UploadedDocument }[],
) {
  const purgeAt = await computePurgeAt(DATA_CATEGORIES.VERIFICATION_DOCUMENT);
  const kinds = documents.map((d) => d.kind);
  await prisma.$transaction([
    // Un nouveau dépôt remplace l'ancien : jamais deux jeux de pièces.
    prisma.verificationDocument.deleteMany({ where: { providerId, kind: { in: kinds } } }),
    ...documents.map(({ kind, document }) =>
      prisma.verificationDocument.create({
        data: {
          providerId,
          kind,
          contentType: document.contentType,
          encryptedContent: encryptDocument(document.buffer),
          purgeAt,
        },
      }),
    ),
  ]);
}

/**
 * Dépôt (ou nouveau dépôt après refus) de la pièce d'identité recto/verso.
 * Ouvre un dossier PENDING ; ne valide jamais rien.
 */
export async function submitIdentityDocuments(providerId: string, front: UploadedDocument, back: UploadedDocument) {
  assertValidDocument("identityFront", front);
  assertValidDocument("identityBack", back);
  await storeDocuments(providerId, [
    { kind: "IDENTITY_FRONT", document: front },
    { kind: "IDENTITY_BACK", document: back },
  ]);
  // Un seul dossier ouvert à la fois : les anciens dossiers en attente
  // (sans résultat) sont remplacés par celui-ci.
  await prisma.verificationRecord.deleteMany({
    where: { providerId, verificationProvider: MANUAL_REVIEW_PROVIDER, status: { in: ["PENDING", "IN_PROGRESS"] } },
  });
  return prisma.verificationRecord.create({
    data: {
      providerId,
      verificationProvider: MANUAL_REVIEW_PROVIDER,
      externalVerificationId: randomUUID(),
      status: "PENDING",
      isAdult: null,
    },
  });
}

/** Dépôt facultatif du permis de travail / contrat. */
export async function submitWorkPermit(providerId: string, document: UploadedDocument) {
  assertValidDocument("workPermit", document);
  await storeDocuments(providerId, [{ kind: "WORK_PERMIT", document }]);
  await prisma.onboardingAttestation.update({
    where: { providerId },
    data: { workPermitStatus: "PENDING", workPermitReviewedAt: null, workPermitRejectionReason: null },
  });
}

/** Dernier dossier de vérification d'identité de la prestataire (pour son tableau de bord). */
export async function getLatestVerification(providerId: string) {
  return prisma.verificationRecord.findFirst({ where: { providerId }, orderBy: { createdAt: "desc" } });
}

/** Une pièce d'identité a été déposée et attend la décision de l'admin. */
export async function hasPendingIdentityReview(providerId: string): Promise<boolean> {
  const count = await prisma.verificationRecord.count({
    where: { providerId, verificationProvider: MANUAL_REVIEW_PROVIDER, status: "PENDING" },
  });
  return count > 0;
}

// ── Côté admin ───────────────────────────────────────────────────────────

const dossierProfileSelect = {
  select: { displayName: true, status: true, slug: true, city: { select: { name: true, canton: true } } },
} as const;

/** File "Identités à valider" : dossiers en attente avec leurs pièces (sans le contenu). */
export async function listIdentityDossiers() {
  await purgeExpiredVerificationDocuments();
  const records = await prisma.verificationRecord.findMany({
    where: { verificationProvider: MANUAL_REVIEW_PROVIDER, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      provider: {
        select: {
          email: true,
          providerProfile: dossierProfileSelect,
          verificationDocuments: {
            where: { kind: { in: ["IDENTITY_FRONT", "IDENTITY_BACK"] } },
            select: { id: true, kind: true, contentType: true, createdAt: true, purgeAt: true },
            orderBy: { kind: "asc" },
          },
        },
      },
    },
  });
  return records;
}

/** File "Permis à valider". */
export async function listWorkPermitDossiers() {
  await purgeExpiredVerificationDocuments();
  return prisma.onboardingAttestation.findMany({
    where: { workPermitStatus: "PENDING" },
    orderBy: { attestedAt: "asc" },
    include: {
      provider: {
        select: {
          email: true,
          providerProfile: dossierProfileSelect,
          verificationDocuments: {
            where: { kind: "WORK_PERMIT" },
            select: { id: true, kind: true, contentType: true, createdAt: true, purgeAt: true },
          },
        },
      },
    },
  });
}

export async function countPendingVerificationDossiers() {
  const [identities, permits] = await Promise.all([
    prisma.verificationRecord.count({ where: { verificationProvider: MANUAL_REVIEW_PROVIDER, status: "PENDING" } }),
    prisma.onboardingAttestation.count({ where: { workPermitStatus: "PENDING" } }),
  ]);
  return { identities, permits };
}

/** Contenu déchiffré d'une pièce — réservé à la route admin (rôle ADMIN vérifié par l'appelant). */
export async function readVerificationDocumentForAdmin(documentId: string) {
  const document = await prisma.verificationDocument.findUnique({ where: { id: documentId } });
  if (!document) return null;
  return { contentType: document.contentType, kind: document.kind, content: decryptDocument(document.encryptedContent) };
}

export class ReviewReasonRequiredError extends Error {
  constructor() {
    super("Un motif est obligatoire pour refuser un dossier");
    this.name = "ReviewReasonRequiredError";
  }
}

export interface DecideIdentityInput {
  verificationRecordId: string;
  adminId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  documentType?: (typeof IDENTITY_DOCUMENT_TYPES)[number];
  issuingCountry?: string;
  /** Publier aussi le profil s'il attend la modération (décision humaine explicite de l'admin). */
  alsoPublishProfile?: boolean;
}

/**
 * Décision de l'admin sur une pièce d'identité. Dans tous les cas, les
 * pièces sont supprimées dans la même transaction que la décision : il
 * ne reste que le résultat.
 */
export async function decideIdentity(input: DecideIdentityInput) {
  const reason = input.reason?.trim() ?? "";
  if (input.decision === "REJECTED" && reason.length === 0) throw new ReviewReasonRequiredError();

  const record = await prisma.verificationRecord.findFirst({
    where: { id: input.verificationRecordId, verificationProvider: MANUAL_REVIEW_PROVIDER, status: "PENDING" },
  });
  if (!record) return null;

  const now = new Date();
  const approved = input.decision === "APPROVED";
  const [updated] = await prisma.$transaction([
    prisma.verificationRecord.update({
      where: { id: record.id },
      data: approved
        ? {
            status: "VERIFIED",
            isAdult: true,
            verifiedAt: now,
            expiresAt: new Date(now.getTime() + VERIFICATION_VALIDITY_MS),
            documentType: input.documentType ?? null,
            issuingCountry: input.issuingCountry?.toUpperCase() || null,
            reviewedById: input.adminId,
            rejectionReason: null,
            retentionPurgeAt: await computePurgeAt(DATA_CATEGORIES.VERIFICATION_RECORD_AUDIT, now),
          }
        : {
            status: "FAILED",
            isAdult: null,
            reviewedById: input.adminId,
            rejectionReason: reason,
            retentionPurgeAt: await computePurgeAt(DATA_CATEGORIES.VERIFICATION_RECORD_AUDIT, now),
          },
    }),
    prisma.verificationDocument.deleteMany({
      where: { providerId: record.providerId, kind: { in: ["IDENTITY_FRONT", "IDENTITY_BACK"] } },
    }),
  ]);

  await recordAuditLog({
    actorId: input.adminId,
    action: approved ? "verification.approve" : "verification.reject",
    targetType: "VerificationRecord",
    targetId: record.id,
    metadata: { providerId: record.providerId, documentType: input.documentType ?? null, documentsDeleted: true },
  });

  if (approved && input.alsoPublishProfile) {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: record.providerId } });
    if (profile?.status === "PENDING_REVIEW") {
      await decideOnProfile({
        profileId: profile.id,
        moderatorId: input.adminId,
        decision: "APPROVED",
        reason: reason || "Identité vérifiée et profil relu par l'admin",
      });
    }
  }
  return updated;
}

export interface DecideWorkPermitInput {
  providerId: string;
  adminId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}

/** Décision sur le permis de travail : résultat conservé, document supprimé. */
export async function decideWorkPermit(input: DecideWorkPermitInput) {
  const reason = input.reason?.trim() ?? "";
  if (input.decision === "REJECTED" && reason.length === 0) throw new ReviewReasonRequiredError();

  const attestation = await prisma.onboardingAttestation.findFirst({
    where: { providerId: input.providerId, workPermitStatus: "PENDING" },
  });
  if (!attestation) return null;

  const approved = input.decision === "APPROVED";
  const [updated] = await prisma.$transaction([
    prisma.onboardingAttestation.update({
      where: { id: attestation.id },
      data: {
        workPermitStatus: approved ? "VERIFIED" : "REJECTED",
        workPermitReviewedAt: new Date(),
        workPermitRejectionReason: approved ? null : reason,
      },
    }),
    prisma.verificationDocument.deleteMany({ where: { providerId: input.providerId, kind: "WORK_PERMIT" } }),
  ]);

  await recordAuditLog({
    actorId: input.adminId,
    action: approved ? "work_permit.approve" : "work_permit.reject",
    targetType: "OnboardingAttestation",
    targetId: attestation.id,
    metadata: { providerId: input.providerId, documentsDeleted: true },
  });
  return updated;
}
