import { prisma } from "@/lib/prisma";

// La vérification d'identité est MANUELLE : seul un admin peut faire
// passer un dossier à VERIFIED (modules/verification/manual-review.service.ts,
// decideIdentity). Il n'existe volontairement plus aucun chemin qui valide
// automatiquement, ni à l'initiative de la prestataire, ni du système.

/**
 * Constraint #2 : un profil ne peut être publié que si sa dernière
 * vérification est VERIFIED, isAdult === true, et non expirée. Utilisé par
 * modules/moderation (une approbation de modérateur ne suffit jamais seule
 * à publier) et par modules/profiles au moment de la publication.
 */
export async function hasPassedAdultVerification(providerId: string): Promise<boolean> {
  const latest = await prisma.verificationRecord.findFirst({
    where: { providerId, status: "VERIFIED", isAdult: true },
    orderBy: { verifiedAt: "desc" },
  });
  if (!latest) return false;
  if (latest.expiresAt && latest.expiresAt < new Date()) return false;
  return true;
}
