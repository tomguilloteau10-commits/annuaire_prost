import { prisma } from "@/lib/prisma";
import { slugifyWithSuffix } from "@/lib/slugify";
import {
  BODY_TYPES,
  CLIENTELE,
  PRICE_RANGES,
  PRICE_RANGE_KEYS,
  priceRangeOf,
  type PriceRange,
} from "./attributes";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import {
  ProfileNotFoundError,
  OnboardingIncompleteError,
  ProfileIncompleteError,
  UnknownTaxonomyReferenceError,
  VerificationIncompleteError,
  type ListPublishedProfilesFilters,
  type PublishedProfileFacets,
  type UpsertProfileInput,
  type UpsertContactInput,
} from "./types";

async function resolveTaxonomyIds(input: UpsertProfileInput) {
  const [city, category, languages, services] = await Promise.all([
    prisma.city.findUnique({ where: { slug: input.citySlug } }),
    prisma.category.findUnique({ where: { key: input.categoryKey } }),
    prisma.language.findMany({ where: { code: { in: input.languageCodes } } }),
    prisma.service.findMany({ where: { key: { in: input.serviceKeys } } }),
  ]);

  if (!city || !city.isActive) throw new UnknownTaxonomyReferenceError("Ville inconnue ou inactive");
  if (!category || !category.isActive) {
    throw new UnknownTaxonomyReferenceError("Catégorie inconnue ou inactive");
  }
  if (languages.length !== input.languageCodes.length) {
    throw new UnknownTaxonomyReferenceError("Langue inconnue");
  }
  if (services.length !== input.serviceKeys.length) {
    throw new UnknownTaxonomyReferenceError("Service inconnu");
  }

  return {
    cityId: city.id,
    categoryId: category.id,
    languageIds: languages.map((l) => l.id),
    serviceIds: services.map((s) => s.id),
  };
}

/**
 * Crée le profil au premier appel, le met à jour ensuite. Ne touche jamais
 * `status` ni `contact` : la publication passe exclusivement par
 * `submitProfileForReview` + modules/moderation, le contact par
 * `upsertOwnContact`.
 */
export async function upsertOwnProfile(userId: string, input: UpsertProfileInput) {
  const { cityId, categoryId, languageIds, serviceIds } = await resolveTaxonomyIds(input);
  const existing = await prisma.providerProfile.findUnique({ where: { userId } });

  if (existing) {
    return prisma.providerProfile.update({
      where: { userId },
      data: {
        displayName: input.displayName,
        age: input.age,
        description: input.description,
        cityId,
        categoryId,
        onlineStatus: input.onlineStatus ?? existing.onlineStatus,
        ...input.details,
        languages: { deleteMany: {}, create: languageIds.map((languageId) => ({ languageId })) },
        services: { deleteMany: {}, create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
  }

  const founderPlan = await prisma.plan.findUniqueOrThrow({ where: { code: "founder" } });

  return prisma.providerProfile.create({
    data: {
      userId,
      slug: slugifyWithSuffix(input.displayName),
      displayName: input.displayName,
      age: input.age,
      description: input.description,
      cityId,
      categoryId,
      planId: founderPlan.id,
      status: "DRAFT",
      onlineStatus: input.onlineStatus ?? "OFFLINE",
      ...input.details,
      languages: { create: languageIds.map((languageId) => ({ languageId })) },
      services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
    },
  });
}

export async function getOwnContact(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;
  return prisma.profileContact.findUnique({ where: { profileId: profile.id } });
}

export async function upsertOwnContact(userId: string, data: UpsertContactInput) {
  const profile = await prisma.providerProfile.findUniqueOrThrow({ where: { userId } });
  return prisma.profileContact.upsert({
    where: { profileId: profile.id },
    update: data,
    create: { profileId: profile.id, ...data },
  });
}

/**
 * Constraint #2 : demande de publication. Refuse tant que l'attestation
 * d'onboarding ou la vérification 18+ ne sont pas complètes — donne un
 * retour immédiat à l'annonceuse plutôt que de la laisser attendre un
 * rejet en modération. La modération revérifie de toute façon ces deux
 * conditions avant de publier (modules/moderation), cette fonction ne
 * remplace pas ce garde-fou, elle l'anticipe.
 */
export async function submitProfileForReview(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new ProfileNotFoundError();

  const [attested, verified] = await Promise.all([
    hasCompletedOnboardingAttestation(userId),
    hasPassedAdultVerification(userId),
  ]);
  if (!attested) throw new OnboardingIncompleteError();
  if (!verified) throw new VerificationIncompleteError();

  // Même checklist que le tableau de bord ("Pour être visible") : au moins
  // une photo non refusée et un WhatsApp, sinon le profil publié serait vide
  // ou injoignable.
  const [photoCount, contact] = await Promise.all([
    prisma.media.count({ where: { profileId: profile.id, status: { not: "REJECTED" } } }),
    prisma.profileContact.findUnique({ where: { profileId: profile.id }, select: { whatsapp: true } }),
  ]);
  if (photoCount === 0) throw new ProfileIncompleteError("photo");
  if (!contact?.whatsapp) throw new ProfileIncompleteError("whatsapp");

  if (profile.status !== "DRAFT" && profile.status !== "REJECTED") {
    return profile; // déjà soumis/publié : idempotent.
  }

  return prisma.providerProfile.update({ where: { userId }, data: { status: "PENDING_REVIEW" } });
}

/**
 * Vue privée pour le tableau de bord de l'annonceuse : inclut son propre
 * profil quel que soit son statut, et l'état de vérification/attestation.
 * Jamais utilisée pour un affichage public (voir listPublishedProfiles /
 * getPublishedProfileBySlug pour ça, avec leur select restreint).
 */
export async function getProviderDashboardData(userId: string) {
  const [profile, latestVerification, attestationCompleted] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        city: true,
        category: true,
        languages: { include: { language: true } },
        services: { include: { service: true } },
        media: { orderBy: { position: "asc" } },
      },
    }),
    prisma.verificationRecord.findFirst({ where: { providerId: userId }, orderBy: { createdAt: "desc" } }),
    hasCompletedOnboardingAttestation(userId),
  ]);

  return { profile, verification: latestVerification, attestationCompleted };
}

/**
 * Données propres au tableau de bord, en plus de getProviderDashboardData :
 * présence d'un WhatsApp (booléen seulement, jamais la valeur) et raison
 * du dernier refus de modération, à montrer à la prestataire.
 */
export async function getProviderDashboardExtras(profileId: string) {
  const [contact, lastRejection] = await Promise.all([
    prisma.profileContact.findUnique({ where: { profileId }, select: { whatsapp: true } }),
    prisma.moderationAction.findFirst({
      where: { targetType: "PROFILE", targetId: profileId, decision: "REJECTED" },
      orderBy: { createdAt: "desc" },
      select: { reason: true },
    }),
  ]);
  return { hasWhatsapp: !!contact?.whatsapp, rejectionReason: lastRejection?.reason ?? null };
}

/**
 * Interrupteur "Disponible maintenant" : ne change que onlineStatus, jamais
 * le contenu ni le statut de modération du profil.
 */
export async function setOwnAvailability(userId: string, available: boolean) {
  return prisma.providerProfile.update({
    where: { userId },
    data: { onlineStatus: available ? "ONLINE" : "OFFLINE" },
    select: { onlineStatus: true },
  });
}

// ── Lecture publique ───────────────────────────────────────────────────
//
// `contact` n'apparaît JAMAIS dans ces `select` (ENGINEERING_RULES.md §5).
// C'est le point d'application structurel de la règle pour l'affichage
// public : personne ne peut réintroduire une fuite de contact ici sans
// modifier explicitement et visiblement ce select.

function publicProfileSelect(mediaLimit?: number) {
  return {
    id: true,
    slug: true,
    displayName: true,
    age: true,
    description: true,
    onlineStatus: true,
    publishedAt: true,
    heightCm: true,
    bodyType: true,
    hairColor: true,
    eyeColor: true,
    rate30Min: true,
    rate1Hour: true,
    rate2Hours: true,
    rateNight: true,
    availableDays: true,
    availableFrom: true,
    availableTo: true,
    receives: true,
    travels: true,
    travelRadiusKm: true,
    tattoos: true,
    piercings: true,
    origin: true,
    clientele: true,
    paymentMethods: true,
    salonSlug: true,
    city: { select: { name: true, canton: true, slug: true } },
    category: { select: { key: true, label: true } },
    languages: { select: { language: { select: { code: true, label: true } } } },
    services: { select: { service: { select: { key: true, label: true } } } },
    media: {
      where: { status: "APPROVED" as const },
      select: { id: true },
      orderBy: { position: "asc" as const },
      ...(mediaLimit ? { take: mediaLimit } : {}),
    },
  };
}

export async function listPublishedProfiles(filters: ListPublishedProfilesFilters) {
  const priceRange =
    filters.priceRange && filters.priceRange in PRICE_RANGES
      ? PRICE_RANGES[filters.priceRange as PriceRange]
      : undefined;
  return prisma.providerProfile.findMany({
    where: {
      status: "PUBLISHED",
      city: filters.citySlug ? { slug: filters.citySlug } : undefined,
      category: filters.categoryKey ? { key: filters.categoryKey } : undefined,
      languages: filters.languageCode
        ? { some: { language: { code: filters.languageCode } } }
        : undefined,
      onlineStatus: filters.onlineOnly ? "ONLINE" : undefined,
      bodyType: filters.bodyType || undefined,
      receives: filters.meeting === "receives" ? true : undefined,
      travels: filters.meeting === "travels" ? true : undefined,
      rate1Hour: priceRange ? { gte: priceRange.min, ...(priceRange.max !== null ? { lte: priceRange.max } : {}) } : undefined,
      clientele: filters.clientele ? { has: filters.clientele } : undefined,
    },
    select: publicProfileSelect(1),
    orderBy: { publishedAt: "desc" },
  });
}

/**
 * Valeurs réellement renseignées par au moins un profil publié : l'annuaire
 * n'affiche un filtre (et ses options) que si des profils peuvent y
 * correspondre. Ne lit que des champs publics, jamais le contact.
 */
export async function getPublishedProfileFacets(): Promise<PublishedProfileFacets> {
  const rows = await prisma.providerProfile.findMany({
    where: { status: "PUBLISHED" },
    select: { bodyType: true, receives: true, travels: true, rate1Hour: true, clientele: true },
  });
  const bodyTypes = new Set<string>();
  const priceRanges = new Set<PriceRange>();
  const clientele = new Set<string>();
  let receives = false;
  let travels = false;
  for (const row of rows) {
    if (row.bodyType) bodyTypes.add(row.bodyType);
    if (row.rate1Hour !== null) priceRanges.add(priceRangeOf(row.rate1Hour));
    row.clientele.forEach((c) => clientele.add(c));
    receives ||= row.receives;
    travels ||= row.travels;
  }
  return {
    bodyTypes: BODY_TYPES.filter((b) => bodyTypes.has(b)),
    meetings: [...(receives ? ["receives" as const] : []), ...(travels ? ["travels" as const] : [])],
    priceRanges: PRICE_RANGE_KEYS.filter((p) => priceRanges.has(p)),
    clientele: CLIENTELE.filter((c) => clientele.has(c)),
  };
}

/** Profils publiés rattachés à un salon (page Salons) : nom et lien seulement. */
export async function listPublishedProfilesBySalon(): Promise<Record<string, { slug: string; displayName: string }[]>> {
  const rows = await prisma.providerProfile.findMany({
    where: { status: "PUBLISHED", salonSlug: { not: null } },
    select: { slug: true, displayName: true, salonSlug: true },
    orderBy: { displayName: "asc" },
  });
  const bySalon: Record<string, { slug: string; displayName: string }[]> = {};
  for (const { salonSlug, slug, displayName } of rows) {
    (bySalon[salonSlug!] ??= []).push({ slug, displayName });
  }
  return bySalon;
}

export async function getPublishedProfileBySlug(slug: string) {
  return prisma.providerProfile.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: publicProfileSelect(),
  });
}

export interface PublishedCityPoint {
  citySlug: string;
  name: string;
  canton: string;
  lat: number;
  lng: number;
  count: number;
}

/**
 * Pour la carte interactive (constraint #8, localisation approximative) :
 * un seul point par ville, au centre-ville (`City.lat`/`City.lng`), avec
 * uniquement un total de profils publiés — jamais un identifiant de
 * profil, un nom ou une coordonnée plus précise que la ville. Agréger ici,
 * côté base, rend structurellement impossible toute fuite plus fine que
 * la ville, quel que soit ce que fait l'appelant du résultat.
 */
export async function listPublishedProfileCityCounts(): Promise<PublishedCityPoint[]> {
  const grouped = await prisma.providerProfile.groupBy({
    by: ["cityId"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const cities = await prisma.city.findMany({
    where: { id: { in: grouped.map((g) => g.cityId) } },
    select: { id: true, slug: true, name: true, canton: true, lat: true, lng: true },
  });
  const cityById = new Map(cities.map((c) => [c.id, c]));

  const points: PublishedCityPoint[] = [];
  for (const group of grouped) {
    const city = cityById.get(group.cityId);
    if (!city || city.lat === null || city.lng === null) continue;
    points.push({
      citySlug: city.slug,
      name: city.name,
      canton: city.canton,
      lat: city.lat,
      lng: city.lng,
      count: group._count._all,
    });
  }
  return points;
}
