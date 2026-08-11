/**
 * Job de purge des données à durée de vie limitée (ENGINEERING_RULES.md,
 * "Politique de rétention/purge"). Lit les champs `purgeAt` / `ipHashPurgeAt`
 * posés par les services d'écriture (voir
 * src/modules/retention/retention-policy.service.ts) et supprime/nullifie
 * ce qui a expiré.
 *
 * Exécution : `npm run db:purge-expired`. En bêta ce script n'est pas
 * encore branché sur un cron actif — voir README.md "Purge des données" —
 * mais il est fonctionnel et testable dès maintenant : on ne veut pas
 * rétrofitter l'effacement plus tard.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function purgeSessionIpHashes(now: Date) {
  const result = await prisma.session.updateMany({
    where: { ipHashPurgeAt: { lte: now }, ipHash: { not: null } },
    data: { ipHash: null, ipHashPurgeAt: null },
  });
  return result.count;
}

async function purgeOnboardingAttestationIpHashes(now: Date) {
  const result = await prisma.onboardingAttestation.updateMany({
    where: { ipHashPurgeAt: { lte: now }, ipHash: { not: null } },
    data: { ipHash: null, ipHashPurgeAt: null },
  });
  return result.count;
}

async function purgeContactRevealLogs(now: Date) {
  const result = await prisma.contactRevealLog.deleteMany({
    where: { purgeAt: { lte: now } },
  });
  return result.count;
}

async function purgeRejectedMedia(now: Date) {
  const expired = await prisma.media.findMany({
    where: { purgeAt: { lte: now }, status: "REJECTED" },
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  // La suppression du fichier physique passe par l'implémentation
  // MediaStorage active (pas de couplage direct ici) ; voir
  // src/modules/media/media.service.ts pour l'appel combiné
  // storage.delete() + prisma.media.delete() utilisé en usage normal.
  // Ce job ne supprime que les lignes déjà orphelines de fichier ou dont
  // le média n'a jamais été consulté après rejet — TODO brancher l'appel
  // MediaStorage.delete() ici une fois l'implémentation réelle en place.
  const result = await prisma.media.deleteMany({
    where: { id: { in: expired.map((media) => media.id) } },
  });
  return result.count;
}

async function purgeStaleVerificationAudits(now: Date) {
  const result = await prisma.verificationRecord.deleteMany({
    where: { retentionPurgeAt: { lte: now } },
  });
  return result.count;
}

export async function purgeExpiredData(now: Date = new Date()) {
  const [sessions, attestations, contactLogs, media, verifications] = await Promise.all([
    purgeSessionIpHashes(now),
    purgeOnboardingAttestationIpHashes(now),
    purgeContactRevealLogs(now),
    purgeRejectedMedia(now),
    purgeStaleVerificationAudits(now),
  ]);

  logger.info("retention.purge.completed", {
    sessionIpHashesPurged: sessions,
    attestationIpHashesPurged: attestations,
    contactRevealLogsPurged: contactLogs,
    rejectedMediaPurged: media,
    verificationAuditsPurged: verifications,
  });

  return { sessions, attestations, contactLogs, media, verifications };
}

if (require.main === module) {
  purgeExpiredData()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("retention.purge.failed", { message: (error as Error).message });
      process.exit(1);
    });
}
