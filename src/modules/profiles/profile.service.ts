import { prisma } from "@/lib/prisma";
import { slugifyWithSuffix } from "@/lib/slugify";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import {
  ProfileNotFoundError,
  OnboardingIncompleteError,
  UnknownTaxonomyReferenceError,
  VerificationIncompleteError,
  type ListPublishedProfilesFilters,
  type UpsertProfileInput,
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
        description: input.description,
        cityId,
        categoryId,
        onlineStatus: input.onlineStatus ?? existing.onlineStatus,
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
      description: input.description,
      cityId,
      categoryId,
      planId: founderPlan.id,
      status: "DRAFT",
      onlineStatus: input.onlineStatus ?? "OFFLINE",
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

export async function upsertOwnContact(userId: string, data: { phone?: string; email?: string }) {
  const profile = await prisma.providerProfile.findUniqueOrThrow({ where: { userId } });
  return prisma.profileContact.upsert({
    where: { profileId: profile.id },
    update: { phone: data.phone, email: data.email },
    create: { profileId: profile.id, phone: data.phone, email: data.email },
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
    description: true,
    onlineStatus: true,
    publishedAt: true,
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
  return prisma.providerProfile.findMany({
    where: {
      status: "PUBLISHED",
      city: filters.citySlug ? { slug: filters.citySlug } : undefined,
      category: filters.categoryKey ? { key: filters.categoryKey } : undefined,
      languages: filters.languageCode
        ? { some: { language: { code: filters.languageCode } } }
        : undefined,
      onlineStatus: filters.onlineOnly ? "ONLINE" : undefined,
    },
    select: publicProfileSelect(1),
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPublishedProfileBySlug(slug: string) {
  return prisma.providerProfile.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: publicProfileSelect(),
  });
}
