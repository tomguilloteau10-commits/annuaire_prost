import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../helpers/db";
import { getPublishedProfileBySlug, listPublishedProfiles } from "@/modules/profiles/profile.service";
import { revealContact } from "@/modules/profiles/contact-reveal.service";

// ENGINEERING_RULES.md §5 : le contact n'apparaît jamais dans une réponse
// de liste ni dans la lecture d'un profil public — seul revealContact()
// (utilisé exclusivement par /api/profiles/[slug]/contact, à la demande)
// y a accès.

const TEST_PHONE = "+41 79 999 99 99";
const TEST_EMAIL = "invariant-contact-test@example.test";

describe("invariant: le contact n'apparaît jamais dans une lecture publique", () => {
  let fixtures: BaseFixtures;
  let slug: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    slug = uniqueSlug("invariant-contact");

    const user = await prisma.user.create({
      data: { email: uniqueEmail("invariant-contact"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);

    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug,
        displayName: "Profil de test contact",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    await prisma.profileContact.create({
      data: { profileId: profile.id, phone: TEST_PHONE, email: TEST_EMAIL },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  it("getPublishedProfileBySlug ne contient ni le champ contact ni ses valeurs", async () => {
    const profile = await getPublishedProfileBySlug(slug);
    expect(profile).not.toHaveProperty("contact");
    const serialized = JSON.stringify(profile);
    expect(serialized).not.toContain(TEST_PHONE);
    expect(serialized).not.toContain(TEST_EMAIL);
  });

  it("listPublishedProfiles ne contient ni le champ contact ni ses valeurs", async () => {
    const list = await listPublishedProfiles({});
    for (const profile of list) {
      expect(profile).not.toHaveProperty("contact");
    }
    expect(JSON.stringify(list)).not.toContain(TEST_PHONE);
    expect(JSON.stringify(list)).not.toContain(TEST_EMAIL);
  });

  it("revealContact() donne bien accès au contact, séparément (le mécanisme existe, juste pas dans la lecture publique)", async () => {
    const revealed = await revealContact(slug, "203.0.113.10");
    expect(revealed?.phone).toBe(TEST_PHONE);
    expect(revealed?.email).toBe(TEST_EMAIL);
  });

  it("revealContact() renvoie null pour un profil qui n'est pas PUBLISHED", async () => {
    const draftSlug = uniqueSlug("invariant-contact-draft");
    const draftUser = await prisma.user.create({
      data: { email: uniqueEmail("invariant-contact-draft"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(draftUser.id);
    const draftProfile = await prisma.providerProfile.create({
      data: {
        userId: draftUser.id,
        slug: draftSlug,
        displayName: "Profil brouillon",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "DRAFT",
      },
    });
    await prisma.profileContact.create({
      data: { profileId: draftProfile.id, phone: TEST_PHONE, email: TEST_EMAIL },
    });

    const revealed = await revealContact(draftSlug, "203.0.113.10");
    expect(revealed).toBeNull();
  });
});
