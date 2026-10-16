import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../../helpers/db";
import { parseDirectoryFilters, toDirectoryQuery, toProfileFilters } from "@/lib/directory-filters";
import { priceRangeOf } from "@/modules/profiles/attributes";
import { getPublishedProfileFacets, listPublishedProfiles } from "@/modules/profiles/profile.service";

describe("paramètres d'URL de l'annuaire", () => {
  it("ignore les valeurs vides ou inconnues et fait l'aller-retour", () => {
    const state = parseDirectoryFilters({ city: "geneve-ge", meeting: "nimporte", price: "MID", online: "true", body: "" });
    expect(state).toEqual({
      city: "geneve-ge",
      category: undefined,
      language: undefined,
      online: true,
      body: undefined,
      meeting: undefined,
      price: "MID",
      clientele: undefined,
    });
    expect(toDirectoryQuery(state)).toBe("city=geneve-ge&online=true&price=MID");
  });

  it("classe le tarif horaire dans la bonne fourchette", () => {
    expect(priceRangeOf(200)).toBe("LOW");
    expect(priceRangeOf(250)).toBe("MID");
    expect(priceRangeOf(350)).toBe("MID");
    expect(priceRangeOf(351)).toBe("HIGH");
  });
});

describe("filtres de la fiche prestataire (base réelle)", () => {
  let fixtures: BaseFixtures;
  const createdUserIds: string[] = [];
  let curvySlug: string;
  let emptySlug: string;

  async function createProfile(prefix: string, data: Record<string, unknown>) {
    const slug = uniqueSlug(prefix);
    const user = await prisma.user.create({
      data: { email: uniqueEmail(prefix), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);
    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug,
        displayName: prefix,
        description: "Description de test suffisamment longue pour respecter les contraintes de validation.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
        ...data,
      },
    });
    return slug;
  }

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    curvySlug = await createProfile("filters-curvy", {
      bodyType: "CURVY",
      travels: true,
      rate1Hour: 420,
      clientele: ["COUPLES"],
    });
    emptySlug = await createProfile("filters-empty", {});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.category.delete({ where: { id: fixtures.categoryId } });
    await prisma.city.delete({ where: { id: fixtures.cityId } });
    await prisma.plan.delete({ where: { id: fixtures.planId } });
    await prisma.$disconnect();
  });

  async function slugsFor(params: Record<string, string>) {
    const filters = toProfileFilters(parseDirectoryFilters(params));
    const profiles = await listPublishedProfiles({ ...filters, categoryKey: undefined });
    return profiles.map((p) => p.slug).filter((s) => s === curvySlug || s === emptySlug);
  }

  it("chaque filtre ne retient que les profils qui ont renseigné le champ correspondant", async () => {
    expect(await slugsFor({})).toEqual(expect.arrayContaining([curvySlug, emptySlug]));
    expect(await slugsFor({ body: "CURVY" })).toEqual([curvySlug]);
    expect(await slugsFor({ meeting: "travels" })).toEqual([curvySlug]);
    expect(await slugsFor({ meeting: "receives" })).toEqual([]);
    expect(await slugsFor({ price: "HIGH" })).toEqual([curvySlug]);
    expect(await slugsFor({ price: "LOW" })).toEqual([]);
    expect(await slugsFor({ clientele: "COUPLES" })).toEqual([curvySlug]);
  });

  it("les facettes n'exposent que des valeurs réellement renseignées", async () => {
    const facets = await getPublishedProfileFacets();
    expect(facets.bodyTypes).toContain("CURVY");
    expect(facets.meetings).toContain("travels");
    expect(facets.priceRanges).toContain("HIGH");
    expect(facets.clientele).toContain("COUPLES");
  });
});
