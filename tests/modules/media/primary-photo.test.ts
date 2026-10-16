import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../../helpers/db";
import { setPrimaryPhoto } from "@/modules/media/media.service";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";

// Lien espace prestataire ↔ page client : la photo choisie comme principale
// passe en tête dès qu'elle est validée ; tant qu'elle est en attente, le
// client voit la première photo validée (jamais la photo en attente).

describe("photo principale", () => {
  let fixtures: BaseFixtures;
  let profileId: string;
  let slug: string;
  const ids: Record<string, string> = {};
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    slug = uniqueSlug("primary-photo");
    const user = await prisma.user.create({
      data: { email: uniqueEmail("primary-photo"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);
    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug,
        displayName: "Photo principale",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    profileId = profile.id;
    for (const [name, position, status] of [
      ["old", 0, "APPROVED"],
      ["other", 1, "APPROVED"],
      ["new", 2, "PENDING"],
    ] as const) {
      const media = await prisma.media.create({
        data: { profileId, storageKey: `${uniqueSlug(name)}.png`, position, status },
      });
      ids[name] = media.id;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.category.delete({ where: { id: fixtures.categoryId } });
    await prisma.city.delete({ where: { id: fixtures.cityId } });
    await prisma.plan.delete({ where: { id: fixtures.planId } });
    await prisma.$disconnect();
  });

  it("une photo en attente choisie comme principale n'est pas montrée au client avant validation", async () => {
    await setPrimaryPhoto(profileId, ids.new!);
    const before = await getPublishedProfileBySlug(slug);
    expect(before?.media.map((m) => m.id)).toEqual([ids.old, ids.other]);

    await prisma.media.update({ where: { id: ids.new }, data: { status: "APPROVED" } });
    const after = await getPublishedProfileBySlug(slug);
    expect(after?.media[0]?.id).toBe(ids.new);
    expect(after?.media.map((m) => m.id)).toEqual([ids.new, ids.old, ids.other]);
  });
});
