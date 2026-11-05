import { prisma } from "@/lib/prisma";
import { slugifyWithSuffix } from "@/lib/slugify";
import { DEMO_SALONS } from "@/modules/showcase/demo-salons";
import type { Prisma } from "@prisma/client";
import {
  AGE_SLIDER,
  BODY_TYPES,
  CLIENTELE,
  CONTACT_METHODS,
  CONTACT_METHOD_FIELD,
  CUP_SIZES,
  EYE_COLORS,
  HAIR_COLORS,
  HEIGHT_TOP_CM,
  ORIGINS,
  PAYMENT_METHODS,
  PRICE_SLIDER,
  PUBIC_HAIR,
  referencePrice,
  type ContactMethod,
} from "./attributes";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import {
  ProfileNotFoundError,
  OnboardingIncompleteError,
  ProfileIncompleteError,
  UnknownTaxonomyReferenceError,
  VerificationIncompleteError,
  type FacetRange,
  type ListPublishedProfilesFilters,
  type NumberRange,
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
  // Le salon choisi doit se trouver dans le canton de la ville du profil.
  if (input.details?.salonSlug) {
    const salon = DEMO_SALONS.find((s) => s.slug === input.details?.salonSlug);
    if (!salon || salon.canton !== city.canton) {
      throw new UnknownTaxonomyReferenceError("Salon hors du canton choisi");
    }
  }
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
 * n'est pas faite ou qu'aucune pièce d'identité n'a été déposée. Le profil
 * peut être envoyé pendant que l'identité est EN COURS de vérification : il
 * reste alors "en attente de vérification" et invisible ; la publication
 * (modules/moderation, decideOnProfile) exige toujours une identité
 * VALIDÉE par l'admin — ce garde-fou-là ne dépend pas de cette fonction.
 */
export async function submitProfileForReview(userId: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new ProfileNotFoundError();

  const [attested, verified, identityUnderReview] = await Promise.all([
    hasCompletedOnboardingAttestation(userId),
    hasPassedAdultVerification(userId),
    prisma.verificationRecord.count({ where: { providerId: userId, status: "PENDING" } }).then((n) => n > 0),
  ]);
  if (!attested) throw new OnboardingIncompleteError();
  if (!verified && !identityUnderReview) throw new VerificationIncompleteError();

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
export class AvailabilityRequiresVerificationError extends Error {
  constructor() {
    super("Se mettre en ligne nécessite une identité vérifiée par l'admin");
    this.name = "AvailabilityRequiresVerificationError";
  }
}

export async function setOwnAvailability(userId: string, available: boolean) {
  // "En ligne" n'a de sens qu'une fois l'identité validée par l'admin ;
  // se mettre hors ligne reste toujours possible.
  if (available && !(await hasPassedAdultVerification(userId))) {
    throw new AvailabilityRequiresVerificationError();
  }
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
    cupSize: true,
    pubicHair: true,
    rateFrom: true,
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

/** Condition Prisma "entre min et max" (bornes facultatives, incluses). */
function between(range: NumberRange | undefined, openTop?: number) {
  if (!range || (range.min === undefined && range.max === undefined)) return undefined;
  const max = range.max !== undefined && range.max !== openTop ? { lte: range.max } : {};
  return { ...(range.min !== undefined ? { gte: range.min } : {}), ...max };
}

const nonEmpty = (list: string[] | undefined) => (list && list.length > 0 ? list : undefined);

/**
 * Critères de la recherche publique, traduits en condition Prisma. Chaque
 * critère ne retient que les profils qui ont renseigné le champ : un champ
 * vide ne correspond jamais à un filtre actif.
 */
function publicProfileWhere(filters: ListPublishedProfilesFilters): Prisma.ProviderProfileWhereInput {
  const and: Prisma.ProviderProfileWhereInput[] = [];

  const price = between(filters.price, PRICE_SLIDER.max);
  if (price) {
    // Tarif de référence : « à partir de » s'il est donné, sinon 1 heure.
    and.push({ OR: [{ rateFrom: price }, { rateFrom: null, rate1Hour: price }] });
  }
  const cup = filters.cup && between(filters.cup);
  if (cup) {
    const from = filters.cup?.min ?? 0;
    const to = filters.cup?.max ?? CUP_SIZES.length - 1;
    and.push({ cupSize: { in: CUP_SIZES.slice(from, to + 1) } });
  }
  const meetings = nonEmpty(filters.meetings);
  if (meetings) {
    and.push({ OR: meetings.map((m) => (m === "receives" ? { receives: true } : { travels: true })) });
  }
  const contactMethods = nonEmpty(filters.contactMethods);
  if (contactMethods) {
    // Canal coché ET coordonnée réellement renseignée (jamais renvoyée ici).
    and.push({
      OR: contactMethods.map((m) => ({
        contactMethods: { has: m },
        contact: { [CONTACT_METHOD_FIELD[m as ContactMethod]]: { not: null } },
      })),
    });
  }
  for (const key of nonEmpty(filters.serviceKeys) ?? []) {
    and.push({ services: { some: { service: { key } } } });
  }

  return {
    status: "PUBLISHED",
    city: filters.citySlug ? { slug: filters.citySlug } : filters.canton ? { canton: filters.canton } : undefined,
    category: filters.categoryKey ? { key: filters.categoryKey } : undefined,
    languages: filters.languageCode ? { some: { language: { code: filters.languageCode } } } : undefined,
    onlineStatus: filters.onlineOnly ? "ONLINE" : undefined,
    age: between(filters.age, AGE_SLIDER.max),
    heightCm: between(filters.heightCm, HEIGHT_TOP_CM),
    bodyType: nonEmpty(filters.bodyTypes) && { in: filters.bodyTypes },
    hairColor: nonEmpty(filters.hairColors) && { in: filters.hairColors },
    eyeColor: nonEmpty(filters.eyeColors) && { in: filters.eyeColors },
    origin: nonEmpty(filters.origins) && { in: filters.origins },
    pubicHair: nonEmpty(filters.pubicHair) && { in: filters.pubicHair },
    tattoos: filters.tattoos,
    paymentMethods: nonEmpty(filters.paymentMethods) && { hasSome: filters.paymentMethods },
    clientele: nonEmpty(filters.clientele) && { hasSome: filters.clientele },
    AND: and,
  };
}

export async function listPublishedProfiles(filters: ListPublishedProfilesFilters) {
  return prisma.providerProfile.findMany({
    where: publicProfileWhere(filters),
    select: publicProfileSelect(1),
    orderBy: { publishedAt: "desc" },
  });
}

/**
 * Canaux de contact réellement joignables d'un profil publié (coché par la
 * prestataire ET coordonnée renseignée). Renvoie uniquement des clés
 * ("WHATSAPP"…), jamais la coordonnée (ENGINEERING_RULES.md §5).
 */
export async function getPublicContactChannels(profileId: string): Promise<ContactMethod[]> {
  const [profile, contact] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: profileId }, select: { contactMethods: true } }),
    prisma.profileContact.findUnique({ where: { profileId } }),
  ]);
  return channelsOf(profile?.contactMethods ?? [], contact);
}

function channelsOf(
  declared: string[],
  contact: { whatsapp: string | null; phone: string | null; email: string | null; instagram: string | null } | null,
): ContactMethod[] {
  return CONTACT_METHODS.filter((m) => declared.includes(m) && !!contact?.[CONTACT_METHOD_FIELD[m]]);
}

function rangeOf(values: number[]): FacetRange | null {
  return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

/**
 * Valeurs réellement renseignées par au moins un profil publié : l'annuaire
 * n'affiche un filtre (et ses options) que si des profils peuvent y
 * correspondre. Le contact n'est lu que pour savoir quels canaux existent :
 * aucune coordonnée ne sort de cette fonction.
 */
export async function getPublishedProfileFacets(): Promise<PublishedProfileFacets> {
  const rows = await prisma.providerProfile.findMany({
    where: { status: "PUBLISHED" },
    select: {
      age: true,
      heightCm: true,
      rateFrom: true,
      rate1Hour: true,
      cupSize: true,
      bodyType: true,
      hairColor: true,
      eyeColor: true,
      origin: true,
      pubicHair: true,
      tattoos: true,
      receives: true,
      travels: true,
      paymentMethods: true,
      contactMethods: true,
      clientele: true,
      contact: { select: { whatsapp: true, phone: true, email: true, instagram: true } },
      services: { select: { service: { select: { key: true, label: true, isActive: true } } } },
    },
  });

  const seen = (pick: (row: (typeof rows)[number]) => (string | null)[]) =>
    new Set(rows.flatMap(pick).filter((v): v is string => !!v));
  const bodyTypes = seen((r) => [r.bodyType]);
  const hairColors = seen((r) => [r.hairColor]);
  const eyeColors = seen((r) => [r.eyeColor]);
  const origins = seen((r) => [r.origin]);
  const pubicHair = seen((r) => [r.pubicHair]);
  const payments = seen((r) => r.paymentMethods);
  const clientele = seen((r) => r.clientele);
  const contacts = seen((r) => channelsOf(r.contactMethods, r.contact));
  const services = new Map<string, unknown>();
  for (const row of rows) {
    for (const { service } of row.services) if (service.isActive) services.set(service.key, service.label);
  }

  return {
    age: rangeOf(rows.flatMap((r) => (r.age !== null ? [r.age] : []))),
    heightCm: rangeOf(rows.flatMap((r) => (r.heightCm !== null ? [Math.min(r.heightCm, HEIGHT_TOP_CM)] : []))),
    price: rangeOf(rows.flatMap((r) => {
      const price = referencePrice(r);
      return price !== null ? [price] : [];
    })),
    cup: rangeOf(
      rows.flatMap((r) => {
        const index = r.cupSize ? CUP_SIZES.indexOf(r.cupSize as (typeof CUP_SIZES)[number]) : -1;
        return index >= 0 ? [index] : [];
      }),
    ),
    bodyTypes: BODY_TYPES.filter((v) => bodyTypes.has(v)),
    hairColors: HAIR_COLORS.filter((v) => hairColors.has(v)),
    eyeColors: EYE_COLORS.filter((v) => eyeColors.has(v)),
    origins: ORIGINS.filter((v) => origins.has(v)),
    pubicHair: PUBIC_HAIR.filter((v) => pubicHair.has(v)),
    tattoos: [true, false].filter((v) => rows.some((r) => r.tattoos === v)),
    meetings: [
      ...(rows.some((r) => r.receives) ? ["receives" as const] : []),
      ...(rows.some((r) => r.travels) ? ["travels" as const] : []),
    ],
    paymentMethods: PAYMENT_METHODS.filter((v) => payments.has(v)),
    contactMethods: CONTACT_METHODS.filter((v) => contacts.has(v)),
    clientele: CLIENTELE.filter((v) => clientele.has(v)),
    services: [...services].map(([key, label]) => ({ key, label })),
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
