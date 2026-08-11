import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ProfileStatus } from "@prisma/client";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../helpers/db";
import { getPublishedProfileBySlug, listPublishedProfiles } from "@/modules/profiles/profile.service";

// ENGINEERING_RULES.md §2 : un profil ne doit jamais être visible
// publiquement tant qu'il n'a pas le statut PUBLISHED — quel que soit son
// statut de vérification par ailleurs. Ce test crée un profil réel pour
// chaque statut non-publié et vérifie qu'aucune fonction de lecture
// publique ne le renvoie.

const NON_PUBLIC_STATUSES: ProfileStatus[] = ["DRAFT", "PENDING_REVIEW", "REJECTED", "SUSPENDED"];

describe("invariant: un profil non PUBLISHED n'est jamais lisible publiquement", () => {
  let fixtures: BaseFixtures;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createProfileWithStatus(status: ProfileStatus, slug: string) {
    const user = await prisma.user.create({
      data: { email: uniqueEmail("invariant-visibility"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);

    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug,
        displayName: "Profil de test d'invariant",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
  }

  it.each(NON_PUBLIC_STATUSES)("statut %s : absent de getPublishedProfileBySlug et listPublishedProfiles", async (status) => {
    const slug = uniqueSlug(`invariant-${status.toLowerCase()}`);
    await createProfileWithStatus(status, slug);

    const bySlug = await getPublishedProfileBySlug(slug);
    expect(bySlug, `un profil ${status} ne doit jamais être renvoyé par getPublishedProfileBySlug`).toBeNull();

    const list = await listPublishedProfiles({});
    expect(list.some((p) => p.slug === slug), `un profil ${status} ne doit jamais apparaître dans listPublishedProfiles`).toBe(
      false,
    );
  });

  it("statut PUBLISHED : présent dans les deux lectures publiques", async () => {
    const slug = uniqueSlug("invariant-published");
    await createProfileWithStatus("PUBLISHED", slug);

    const bySlug = await getPublishedProfileBySlug(slug);
    expect(bySlug?.slug).toBe(slug);

    const list = await listPublishedProfiles({});
    expect(list.some((p) => p.slug === slug)).toBe(true);
  });
});
