import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../../helpers/db";
import { parseDirectoryFilters, toDirectoryQuery, toProfileFilters } from "@/lib/directory-filters";
import { getPublishedProfileFacets, listPublishedProfiles } from "@/modules/profiles/profile.service";

describe("paramètres d'URL de l'annuaire", () => {
  it("ignore les valeurs vides ou inconnues et fait l'aller-retour", () => {
    const state = parseDirectoryFilters({
      city: "geneve-ge",
      meeting: "nimporte,travels",
      hair: "BLONDE,BROWN,VERT",
      online: "true",
      body: "",
      ageMin: "25",
      ageMax: "abc",
      cupMin: "B",
      cupMax: "Z",
      tattoos: "peut-etre",
      services: "gfe,massage",
    });
    expect(state.city).toBe("geneve-ge");
    expect(state.online).toBe(true);
    expect(state.tattoos).toBeUndefined();
    expect(state.lists).toEqual({ meeting: ["travels"], hair: ["BLONDE", "BROWN"] });
    expect(state.ranges).toEqual({ age: { min: 25, max: undefined }, cup: { min: 1, max: undefined } });
    expect(state.services).toEqual(["gfe", "massage"]);
    expect(toDirectoryQuery(state)).toBe(
      "city=geneve-ge&online=true&ageMin=25&cupMin=B&hair=BLONDE%2CBROWN&meeting=travels&services=gfe%2Cmassage",
    );
  });

  it("remet dans l'ordre un minimum supérieur au maximum", () => {
    expect(parseDirectoryFilters({ priceMin: "500", priceMax: "200" }).ranges.price).toEqual({ min: 200, max: 500 });
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
    const service = await prisma.service.upsert({
      where: { key: "test-service-filters" },
      update: {},
      create: { key: "test-service-filters", label: { fr: "Service de test" } },
    });
    curvySlug = await createProfile("filters-curvy", {
      age: 31,
      heightCm: 172,
      bodyType: "CURVY",
      hairColor: "BROWN",
      cupSize: "D",
      pubicHair: "TRIMMED",
      tattoos: true,
      travels: true,
      rateFrom: 300,
      rate1Hour: 420,
      paymentMethods: ["TWINT"],
      contactMethods: ["WHATSAPP", "INSTAGRAM"],
      clientele: ["COUPLES"],
      contact: { create: { whatsapp: "+41 79 000 00 01" } },
      services: { create: [{ serviceId: service.id }] },
    });
    emptySlug = await createProfile("filters-empty", {});
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.service.deleteMany({ where: { key: "test-service-filters" } });
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
    expect(await slugsFor({ body: "CURVY,SLIM" })).toEqual([curvySlug]);
    expect(await slugsFor({ body: "SLIM" })).toEqual([]);
    expect(await slugsFor({ hair: "BROWN" })).toEqual([curvySlug]);
    expect(await slugsFor({ pubic: "TRIMMED" })).toEqual([curvySlug]);
    expect(await slugsFor({ tattoos: "yes" })).toEqual([curvySlug]);
    expect(await slugsFor({ tattoos: "no" })).toEqual([]);
    expect(await slugsFor({ meeting: "travels" })).toEqual([curvySlug]);
    expect(await slugsFor({ meeting: "receives" })).toEqual([]);
    expect(await slugsFor({ payment: "TWINT,CASH" })).toEqual([curvySlug]);
    expect(await slugsFor({ clientele: "COUPLES" })).toEqual([curvySlug]);
    expect(await slugsFor({ services: "test-service-filters" })).toEqual([curvySlug]);
  });

  it("curseurs : âge, taille, tarif « à partir de » et poitrine", async () => {
    expect(await slugsFor({ ageMin: "30", ageMax: "35" })).toEqual([curvySlug]);
    expect(await slugsFor({ ageMax: "25" })).toEqual([]);
    expect(await slugsFor({ heightMin: "170", heightMax: "199" })).toEqual([curvySlug]);
    // le tarif « à partir de » (300) prime sur le tarif 1 heure (420)
    expect(await slugsFor({ priceMax: "350" })).toEqual([curvySlug]);
    expect(await slugsFor({ priceMin: "400" })).toEqual([]);
    expect(await slugsFor({ cupMin: "C", cupMax: "E" })).toEqual([curvySlug]);
    expect(await slugsFor({ cupMax: "B" })).toEqual([]);
  });

  it("contact : seul un canal coché ET renseigné est retenu", async () => {
    expect(await slugsFor({ contact: "WHATSAPP" })).toEqual([curvySlug]);
    // Instagram coché mais pas renseigné : pas proposé aux clients
    expect(await slugsFor({ contact: "INSTAGRAM" })).toEqual([]);
  });

  it("les facettes n'exposent que des valeurs réellement renseignées, jamais une coordonnée", async () => {
    const facets = await getPublishedProfileFacets();
    expect(facets.bodyTypes).toContain("CURVY");
    expect(facets.pubicHair).toContain("TRIMMED");
    expect(facets.meetings).toContain("travels");
    expect(facets.paymentMethods).toContain("TWINT");
    expect(facets.contactMethods).toContain("WHATSAPP");
    expect(facets.contactMethods).not.toContain("INSTAGRAM");
    expect(facets.clientele).toContain("COUPLES");
    expect(facets.services.map((s) => s.key)).toContain("test-service-filters");
    expect(facets.age && facets.age.min <= 31 && facets.age.max >= 31).toBe(true);
    expect(facets.cup).not.toBeNull();
    expect(JSON.stringify(facets)).not.toContain("+41 79 000 00 01");
  });
});
