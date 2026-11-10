/**
 * Purge des données à durée de vie limitée (ENGINEERING_RULES.md,
 * "Politique de rétention/purge"). Lit les champs `purgeAt` / `ipHashPurgeAt`
 * posés par les services d'écriture (voir retention-policy.service.ts) et
 * supprime/nullifie ce qui a expiré.
 *
 * Exécutée automatiquement : au démarrage du conteneur
 * (docker-entrypoint.sh) puis toutes les 6 heures par le serveur
 * (src/instrumentation.ts). Aussi disponible à la main :
 * `npm run db:purge-expired`. Volontairement sans "server-only" : utilisée
 * aussi par ce script, hors de Next.js.
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { purgeExpiredVerificationDocuments } from "@/modules/verification/document-retention";

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
    select: { id: true, storageKey: true },
  });
  if (expired.length === 0) return 0;

  const result = await prisma.media.deleteMany({
    where: { id: { in: expired.map((media) => media.id) } },
  });
  // Le fichier aussi, pas seulement la ligne : une photo refusée ne doit
  // pas rester sur le disque. (Écrit directement : le module de stockage
  // est réservé au serveur Next.js et ce code tourne aussi en script.)
  const directory = process.env.MEDIA_LOCAL_PATH ?? "./storage/media";
  for (const { storageKey } of expired) {
    await rm(path.join(directory, path.basename(storageKey)), { force: true });
  }
  return result.count;
}

/** Sessions expirées : supprimées (elles ne servent plus et portent un hash d'IP). */
async function purgeExpiredSessions(now: Date) {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  return result.count;
}

async function purgeStaleVerificationAudits(now: Date) {
  const result = await prisma.verificationRecord.deleteMany({
    where: { retentionPurgeAt: { lte: now } },
  });
  return result.count;
}

export async function purgeExpiredData(now: Date = new Date()) {
  const [sessions, expiredSessions, attestations, contactLogs, media, verifications, verificationDocuments] = await Promise.all([
    purgeSessionIpHashes(now),
    purgeExpiredSessions(now),
    purgeOnboardingAttestationIpHashes(now),
    purgeContactRevealLogs(now),
    purgeRejectedMedia(now),
    purgeStaleVerificationAudits(now),
    // Pièces d'identité / permis jamais examinés dans le délai maximal.
    purgeExpiredVerificationDocuments(now),
  ]);

  logger.info("retention.purge.completed", {
    sessionIpHashesPurged: sessions,
    expiredSessionsDeleted: expiredSessions,
    attestationIpHashesPurged: attestations,
    contactRevealLogsPurged: contactLogs,
    rejectedMediaPurged: media,
    verificationAuditsPurged: verifications,
    verificationDocumentsPurged: verificationDocuments,
  });

  return { sessions, expiredSessions, attestations, contactLogs, media, verifications, verificationDocuments };
}
