/**
 * Purge des données à durée de vie limitée (pièces d'identité non traitées
 * après 30 jours, hash d'IP, sessions expirées, photos refusées…) toutes
 * les 6 heures, pour que la politique de rétention s'applique sans
 * intervention manuelle. Aussi lancée au démarrage du conteneur
 * (docker-entrypoint.sh).
 */
import { purgeExpiredData } from "@/modules/retention/purge";
import { logger } from "@/lib/logger";

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

if (process.env.NEXT_PHASE !== "phase-production-build") {
  setInterval(() => {
    purgeExpiredData().catch((error: unknown) =>
      logger.error("retention.purge.failed", { message: (error as Error).message }),
    );
  }, PURGE_INTERVAL_MS).unref?.();
  logger.info("retention.purge.scheduled", { everyHours: PURGE_INTERVAL_MS / 3_600_000 });
}
