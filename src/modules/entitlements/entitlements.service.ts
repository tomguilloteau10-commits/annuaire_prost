import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Entitlements / feature flags par plan. En bêta, toutes les annonceuses
 * sont sur le plan "founder" (gratuit) — voir prisma/seed.ts. Activer un
 * plan "premium" plus tard ne demande aucune réécriture : on ajoute une
 * ligne `Plan` avec ses `features`, et on la réassigne aux profils
 * concernés (`ProviderProfile.planId`). Rappel ENGINEERING_RULES.md §3-4 :
 * un plan est un abonnement de publicité forfaitaire, jamais un mécanisme
 * de commission ou de contrôle sur le travail des annonceuses.
 */
const planFeaturesSchema = z.object({
  maxPhotos: z.number().int().positive(),
  boost: z.boolean(),
  prioritySupport: z.boolean(),
});

export type PlanFeatures = z.infer<typeof planFeaturesSchema>;

// Repli si Plan.features est manquant/malformé en base — ne doit
// normalement jamais servir, mais évite un crash pour un choix produit
// (nombre de photos autorisées) plutôt qu'une invariant de sécurité.
const FALLBACK_FEATURES: PlanFeatures = { maxPhotos: 6, boost: false, prioritySupport: false };

export async function getPlanFeatures(planId: string): Promise<PlanFeatures> {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });
  const parsed = planFeaturesSchema.safeParse(plan.features);
  return parsed.success ? parsed.data : FALLBACK_FEATURES;
}

export async function getProviderEntitlements(profileId: string): Promise<PlanFeatures> {
  const profile = await prisma.providerProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { planId: true },
  });
  return getPlanFeatures(profile.planId);
}

export function canUploadMorePhotos(currentPhotoCount: number, features: PlanFeatures): boolean {
  return currentPhotoCount < features.maxPhotos;
}
