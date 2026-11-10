import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueEmail, uniqueSlug, type BaseFixtures } from "../helpers/db";
import {
  getPublishedProfileBySlug,
  listPublishedProfileCityCounts,
  listPublishedProfiles,
  upsertOwnProfile,
} from "@/modules/profiles/profile.service";
import { revealContact } from "@/modules/profiles/contact-reveal.service";
import {
  markSubscriptionPaid,
  pauseSubscription,
  refreshSubscriptionStatuses,
} from "@/modules/subscriptions/subscription.service";
import { PAYMENT_GRACE_DAYS, addDays } from "@/modules/subscriptions/subscription-rules";

// Abonnement (paiement hors plateforme) : un profil en pause ou impayé
// depuis trop longtemps disparaît de TOUTES les lectures publiques, sans
// être supprimé ni modifié, et réapparaît dès que l'admin marque le
// paiement reçu. Un paiement ne contourne jamais la modération.

describe("invariant: visibilité publique liée à l'abonnement", () => {
  let fixtures: BaseFixtures;
  let adminId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    const admin = await prisma.user.create({
      data: { email: uniqueEmail("invariant-sub-admin"), passwordHash: "x", role: "ADMIN" },
    });
    adminId = admin.id;
    createdUserIds.push(admin.id);
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function publishedProfile(trialEndsAt: Date, status: "PUBLISHED" | "DRAFT" = "PUBLISHED") {
    const user = await prisma.user.create({
      data: { email: uniqueEmail("invariant-sub"), passwordHash: "x", role: "PROVIDER" },
    });
    createdUserIds.push(user.id);
    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        slug: uniqueSlug("invariant-sub"),
        displayName: "Profil abonnement",
        description: "Description de test suffisamment longue pour respecter les contraintes.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status,
        publishedAt: new Date(),
        subscription: { create: { status: "TRIAL", trialEndsAt } },
        contact: { create: { whatsapp: "+41 79 000 00 09" } },
      },
    });
    return profile;
  }

  async function isPublic(profile: { id: string; slug: string }) {
    const bySlug = await getPublishedProfileBySlug(profile.slug);
    const list = await listPublishedProfiles({});
    const contact = await revealContact(profile.slug, null);
    const cities = await listPublishedProfileCityCounts();
    const flags = [!!bySlug, list.some((p) => p.slug === profile.slug), !!contact];
    // Toutes les lectures publiques doivent être d'accord.
    expect(new Set(flags).size, `lectures publiques incohérentes : ${flags}`).toBe(1);
    expect(cities).toBeDefined();
    return flags[0];
  }

  it("la création d'un profil démarre un essai gratuit de 30 jours", async () => {
    const user = await prisma.user.create({ data: { email: uniqueEmail("invariant-sub-new"), passwordHash: "x", role: "PROVIDER" } });
    createdUserIds.push(user.id);
    const category = await prisma.category.findUniqueOrThrow({ where: { id: fixtures.categoryId } });
    const city = await prisma.city.findUniqueOrThrow({ where: { id: fixtures.cityId } });
    await prisma.plan.upsert({ where: { code: "founder" }, update: {}, create: { code: "founder", name: "Founder", features: { maxPhotos: 6, boost: false, prioritySupport: false } } });
    const before = Date.now();
    const profile = await upsertOwnProfile(user.id, {
      displayName: "Nouvelle",
      age: 30,
      description: "Description de test suffisamment longue pour la validation.",
      citySlug: city.slug,
      categoryKey: category.key,
      languageCodes: [],
      serviceKeys: [],
    });
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { profileId: profile.id } });
    expect(sub.status).toBe("TRIAL");
    const days = (sub.trialEndsAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(29.99);
    expect(days).toBeLessThan(30.01);
  });

  it("essai en cours : visible ; essai fini depuis peu : encore visible (délai de grâce)", async () => {
    expect(await isPublic(await publishedProfile(addDays(new Date(), 10)))).toBe(true);
    expect(await isPublic(await publishedProfile(addDays(new Date(), -2)))).toBe(true);
  });

  it("paiement dû trop longtemps : dépublié, sans être supprimé ; « payé » le republie", async () => {
    const profile = await publishedProfile(addDays(new Date(), -(PAYMENT_GRACE_DAYS + 3)));
    expect(await refreshSubscriptionStatuses()).toBeGreaterThan(0);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { profileId: profile.id } })).status).toBe("PAYMENT_DUE");
    expect(await isPublic(profile)).toBe(false);
    expect(await prisma.providerProfile.count({ where: { id: profile.id, status: "PUBLISHED" } })).toBe(1);

    await markSubscriptionPaid(profile.id, adminId);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { profileId: profile.id } });
    expect(sub.status).toBe("ACTIVE");
    expect(Math.round((sub.paidUntil!.getTime() - Date.now()) / 86_400_000)).toBe(30);
    expect(await isPublic(profile)).toBe(true);
  });

  it("en pause : dépublié tout de suite ; « payé » le réactive", async () => {
    const profile = await publishedProfile(addDays(new Date(), 20));
    await pauseSubscription(profile.id, adminId);
    expect(await isPublic(profile)).toBe(false);
    await markSubscriptionPaid(profile.id, adminId);
    expect(await isPublic(profile)).toBe(true);
  });

  it("un paiement ne publie jamais un profil non validé par la modération", async () => {
    const draft = await publishedProfile(addDays(new Date(), -30), "DRAFT");
    await markSubscriptionPaid(draft.id, adminId);
    expect(await getPublishedProfileBySlug(draft.slug)).toBeNull();
  });
});
