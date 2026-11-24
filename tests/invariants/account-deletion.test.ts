import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, listedTrial } from "../helpers/db";
import { getMediaStorage } from "@/modules/media";
import { AccountDeletionNotAllowedError, deleteProviderAccount } from "@/modules/account/account-deletion.service";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe("suppression du compte par la prestataire", () => {
  let userId = "";
  let profileId = "";
  let storageKey = "";
  let adminId = "";

  beforeAll(async () => {
    const fixtures = await ensureBaseFixtures();
    const user = await prisma.user.create({
      data: { email: uniqueEmail("delete-me"), passwordHash: "x", role: "PROVIDER" },
    });
    userId = user.id;
    const profile = await prisma.providerProfile.create({
      data: {
        subscription: listedTrial(),
        userId,
        slug: uniqueSlug("delete-me"),
        displayName: "À supprimer",
        description:
          "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    profileId = profile.id;
    storageKey = (await getMediaStorage().upload({ buffer: PNG, contentType: "image/png" })).storageKey;
    await prisma.media.create({ data: { profileId, storageKey, status: "APPROVED", position: 0 } });
    await prisma.profileContact.create({ data: { profileId, phone: "+41 79 000 00 00" } });
    await prisma.session.create({
      data: { userId, tokenHash: `del-${Date.now()}`, expiresAt: new Date(Date.now() + 1e6) },
    });
    await prisma.contactRevealLog.create({
      data: { profileId, requesterIpHash: "h", purgeAt: new Date(Date.now() + 1e6) },
    });
    await prisma.auditLog.create({
      data: { actorId: userId, action: "profile.submit", targetType: "PROFILE", targetId: profileId },
    });
    adminId = (
      await prisma.user.create({ data: { email: uniqueEmail("delete-admin"), passwordHash: "x", role: "ADMIN" } })
    ).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
    await prisma.$disconnect();
  });

  it("refuse de supprimer un compte admin", async () => {
    await expect(deleteProviderAccount(adminId)).rejects.toBeInstanceOf(AccountDeletionNotAllowedError);
    expect(await prisma.user.count({ where: { id: adminId } })).toBe(1);
  });

  it("efface le compte, l'annonce, les coordonnées, les photos (fichiers compris) et les journaux liés", async () => {
    const file = path.join(process.env.MEDIA_LOCAL_PATH ?? "./storage/media", path.basename(storageKey));
    expect(existsSync(file)).toBe(true);

    await deleteProviderAccount(userId);

    expect(await prisma.user.count({ where: { id: userId } })).toBe(0);
    expect(await prisma.providerProfile.count({ where: { id: profileId } })).toBe(0);
    expect(await prisma.profileContact.count({ where: { profileId } })).toBe(0);
    expect(await prisma.media.count({ where: { profileId } })).toBe(0);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect(await prisma.subscription.count({ where: { profileId } })).toBe(0);
    expect(await prisma.contactRevealLog.count({ where: { profileId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { actorId: userId } })).toBe(0);
    expect(existsSync(file)).toBe(false);
  });
});
