/**
 * Purge manuelle des données à durée de vie limitée : `npm run db:purge-expired`.
 * La logique vit dans src/modules/retention/purge.ts (aussi exécutée
 * automatiquement au démarrage et toutes les 6 heures).
 */
import { logger } from "@/lib/logger";
import { purgeExpiredData } from "@/modules/retention/purge";

purgeExpiredData()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("retention.purge.failed", { message: (error as Error).message });
    process.exit(1);
  });
