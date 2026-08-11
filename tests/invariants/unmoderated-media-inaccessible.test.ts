import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../helpers/db";
import { getPublicPhotoUrl } from "@/modules/media/media.service";

// ENGINEERING_RULES.md §6 : un média non modéré (status !== APPROVED)
// n'est jamais accessible publiquement, même avec un identifiant valide.
// getPublicPhotoUrl() est le seul point qui génère une URL de lecture ;
// ce test vérifie qu'il refuse tout statut autre qu'APPROVED.

describe("invariant: un média non modéré n'est jamais accessible via getPublicPhotoUrl", () => {
  let fixtures: BaseFixtures;
  let profileId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();

    const user = await prisma.user.create({
      data: { email: uniqueEmail("invariant-media"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);

    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug: uniqueSlug("invariant-media"),
        displayName: "Profil de test média",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    profileId = profile.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createMedia(status: "PENDING" | "APPROVED" | "REJECTED") {
    const media = await prisma.media.create({
      data: {
        profileId,
        storageKey: `${randomBytes(8).toString("hex")}.png`,
        status,
      },
    });
    return media.id;
  }

  it("un média PENDING renvoie null", async () => {
    const mediaId = await createMedia("PENDING");
    expect(await getPublicPhotoUrl(mediaId)).toBeNull();
  });

  it("un média REJECTED renvoie null", async () => {
    const mediaId = await createMedia("REJECTED");
    expect(await getPublicPhotoUrl(mediaId)).toBeNull();
  });

  it("un média APPROVED renvoie une URL signée", async () => {
    const mediaId = await createMedia("APPROVED");
    const url = await getPublicPhotoUrl(mediaId);
    expect(url).toMatch(/^\/api\/media\/serve\?/);
  });

  it("un identifiant de média inexistant renvoie null", async () => {
    expect(await getPublicPhotoUrl("does-not-exist")).toBeNull();
  });
});
