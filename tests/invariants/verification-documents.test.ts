import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueEmail, uniqueSlug, type BaseFixtures } from "../helpers/db";
import { decryptDocument, encryptDocument } from "@/modules/verification/document-crypto";
import {
  decideIdentity,
  decideWorkPermit,
  purgeExpiredVerificationDocuments,
  submitIdentityDocuments,
  submitWorkPermit,
} from "@/modules/verification/manual-review.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { decideOnProfile, VerificationRequiredError } from "@/modules/moderation/moderation-queue.service";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";

// ENGINEERING_RULES.md §1 et §2 : les pièces d'identité ne sont gardées
// que le temps de la vérification par l'admin (chiffrées), supprimées à la
// décision ou à échéance ; la majorité n'est validée que par l'admin et un
// profil ne peut pas être publié avant.

// Fichiers synthétiques (signatures valides, contenu factice).
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("synthetic-png")]);
const PDF = Buffer.from("%PDF-1.4\n% document de test synthétique\n");

describe("invariant: documents de vérification temporaires et validation par l'admin uniquement", () => {
  let fixtures: BaseFixtures;
  let adminId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    const admin = await prisma.user.create({
      data: { email: uniqueEmail("invariant-admin"), passwordHash: "not-a-real-hash", role: "ADMIN" },
    });
    adminId = admin.id;
    createdUserIds.push(admin.id);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: createdUserIds } } });
    await prisma.moderationAction.deleteMany({ where: { moderatorId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createProvider() {
    const user = await prisma.user.create({
      data: { email: uniqueEmail("invariant-docs"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);
    await prisma.onboardingAttestation.create({
      data: {
        providerId: user.id,
        attestedAdult: true,
        attestedVoluntary: true,
        attestedAuthorizedToWorkInSwitzerland: true,
        attestedCantonalDeclaration: true,
        attestedAt: new Date(),
      },
    });
    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug: uniqueSlug("invariant-docs"),
        displayName: "Profil de test documents",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PENDING_REVIEW",
      },
    });
    return { userId: user.id, profile };
  }

  it("chiffre les documents : le contenu stocké n'est pas le fichier en clair", async () => {
    const stored = encryptDocument(PNG);
    expect(stored.includes(PNG)).toBe(false);
    expect(decryptDocument(stored).equals(PNG)).toBe(true);

    const { userId } = await createProvider();
    await submitIdentityDocuments(
      userId,
      { buffer: PNG, contentType: "image/png" },
      { buffer: PDF, contentType: "application/pdf" },
    );
    const docs = await prisma.verificationDocument.findMany({ where: { providerId: userId } });
    expect(docs).toHaveLength(2);
    for (const doc of docs) {
      const raw = Buffer.from(doc.encryptedContent);
      expect(raw.includes(PNG) || raw.includes(PDF)).toBe(false);
      expect(doc.purgeAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("dépôt seul : identité non vérifiée, profil non publiable ni public", async () => {
    const { userId, profile } = await createProvider();
    await submitIdentityDocuments(
      userId,
      { buffer: PNG, contentType: "image/png" },
      { buffer: PNG, contentType: "image/png" },
    );

    expect(await hasPassedAdultVerification(userId)).toBe(false);
    await expect(
      decideOnProfile({ profileId: profile.id, moderatorId: adminId, decision: "APPROVED", reason: "test" }),
    ).rejects.toBeInstanceOf(VerificationRequiredError);
    expect(await getPublishedProfileBySlug(profile.slug)).toBeNull();
  });

  it("validation par l'admin : 18+ vérifié, documents supprimés, profil publiable", async () => {
    const { userId, profile } = await createProvider();
    const record = await submitIdentityDocuments(
      userId,
      { buffer: PNG, contentType: "image/png" },
      { buffer: PDF, contentType: "application/pdf" },
    );

    await decideIdentity({
      verificationRecordId: record.id,
      adminId,
      decision: "APPROVED",
      documentType: "passport",
      issuingCountry: "CH",
      alsoPublishProfile: true,
    });

    expect(await prisma.verificationDocument.count({ where: { providerId: userId } })).toBe(0);
    const updated = await prisma.verificationRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(updated).toMatchObject({ status: "VERIFIED", isAdult: true, documentType: "passport", issuingCountry: "CH" });
    expect(updated.verifiedAt).not.toBeNull();
    expect(await hasPassedAdultVerification(userId)).toBe(true);
    expect((await getPublishedProfileBySlug(profile.slug))?.slug).toBe(profile.slug);
  });

  it("refus par l'admin : documents supprimés, motif conservé, toujours non vérifiée", async () => {
    const { userId } = await createProvider();
    const record = await submitIdentityDocuments(
      userId,
      { buffer: PNG, contentType: "image/png" },
      { buffer: PNG, contentType: "image/png" },
    );
    await submitWorkPermit(userId, { buffer: PDF, contentType: "application/pdf" });

    await decideIdentity({ verificationRecordId: record.id, adminId, decision: "REJECTED", reason: "Photo illisible" });
    await decideWorkPermit({ providerId: userId, adminId, decision: "REJECTED", reason: "Document expiré" });

    expect(await prisma.verificationDocument.count({ where: { providerId: userId } })).toBe(0);
    const updated = await prisma.verificationRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(updated).toMatchObject({ status: "FAILED", rejectionReason: "Photo illisible" });
    expect(await hasPassedAdultVerification(userId)).toBe(false);
    const attestation = await prisma.onboardingAttestation.findUniqueOrThrow({ where: { providerId: userId } });
    expect(attestation).toMatchObject({ workPermitStatus: "REJECTED", workPermitRejectionReason: "Document expiré" });
  });

  it("sans décision : documents purgés à échéance, dossier expiré", async () => {
    const { userId } = await createProvider();
    const record = await submitIdentityDocuments(
      userId,
      { buffer: PNG, contentType: "image/png" },
      { buffer: PNG, contentType: "image/png" },
    );
    await prisma.verificationDocument.updateMany({
      where: { providerId: userId },
      data: { purgeAt: new Date(Date.now() - 1000) },
    });

    await purgeExpiredVerificationDocuments();

    expect(await prisma.verificationDocument.count({ where: { providerId: userId } })).toBe(0);
    const updated = await prisma.verificationRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(updated.status).toBe("EXPIRED");
  });
});
