import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getMediaStorage } from "@/modules/media";

export class AccountDeletionNotAllowedError extends Error {
  constructor() {
    super("Seul un compte prestataire peut être supprimé par sa titulaire");
    this.name = "AccountDeletionNotAllowedError";
  }
}

/**
 * Suppression DÉFINITIVE d'un compte prestataire par sa titulaire (droit à
 * l'effacement, nLPD ; retrait du consentement aux données sensibles).
 *
 * Effacé : compte, sessions, liens de réinitialisation, annonce (profil,
 * coordonnées, prestations, langues, disponibilités), photos (lignes ET
 * fichiers), pièces d'identité en attente, résultat de vérification,
 * attestations, abonnement, signalements visant l'annonce, journal des
 * affichages de contact et journal de ses propres actions.
 *
 * Conservé : les décisions prises par l'administration (journal d'audit de
 * l'admin, sans donnée de contact), comme trace de la modération.
 */
export async function deleteProviderAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      providerProfile: { select: { id: true, media: { select: { storageKey: true } } } },
    },
  });
  if (!user) return;
  if (user.role !== "PROVIDER") throw new AccountDeletionNotAllowedError();

  const profileId = user.providerProfile?.id;
  const storageKeys = user.providerProfile?.media.map((m) => m.storageKey) ?? [];

  await prisma.$transaction([
    ...(profileId ? [prisma.contactRevealLog.deleteMany({ where: { profileId } })] : []),
    prisma.auditLog.deleteMany({ where: { actorId: userId } }),
    // Le reste suit par suppression en cascade (voir prisma/schema.prisma).
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Fichiers des photos, après la base : un échec ici n'empêche pas la
  // suppression du compte (le fichier, devenu orphelin, n'est plus servi).
  const storage = getMediaStorage();
  for (const key of storageKeys) {
    await storage.delete(key).catch(() => logger.warn("account.delete.media_file_left", { count: 1 }));
  }
  logger.info("account.deleted", { photos: storageKeys.length });
}
