import { z } from "zod";
import { logger } from "./logger";

// Validation stricte des variables d'environnement au démarrage : on
// préfère un crash immédiat et lisible à une valeur `undefined` silencieuse
// qui finirait par casser une signature de cookie ou un hash d'IP en
// production.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  CSRF_SECRET: z.string().min(16),
  APP_IP_HASH_SECRET: z.string().min(16),
  VERIFICATION_PROVIDER: z.enum(["mock"]).default("mock"),
  MEDIA_STORAGE_DRIVER: z.enum(["local"]).default("local"),
  MEDIA_LOCAL_PATH: z.string().default("./storage/media"),
  MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  MEDIA_SIGNING_SECRET: z.string().min(16),
  // Clé de chiffrement des pièces d'identité déposées (32 octets en base64
  // ou hex). Facultative : à défaut, une clé dédiée est dérivée de
  // SESSION_SECRET (voir modules/verification/document-crypto.ts).
  DOCUMENT_ENCRYPTION_KEY: z.string().min(32).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variables d'environnement invalides ou manquantes:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  cachedEnv = parsed.data;
  warnAboutExampleSecrets(cachedEnv);
  return cachedEnv;
}

const SECRET_NAMES = ["SESSION_SECRET", "CSRF_SECRET", "APP_IP_HASH_SECRET", "MEDIA_SIGNING_SECRET"] as const;

/**
 * Les valeurs d'exemple de .env.example sont publiques (dépôt) : en
 * production elles permettraient de recalculer les hash d'IP, de forger
 * des liens de photo, ou de déchiffrer les pièces d'identité. Avec Docker,
 * docker-entrypoint.sh les remplace automatiquement ; hors Docker, on le
 * signale bruyamment au démarrage (sans bloquer).
 */
function warnAboutExampleSecrets(env: Env) {
  if (env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  const weak = SECRET_NAMES.filter((name) => env[name].includes("change-me"));
  if (weak.length > 0) {
    logger.error("security.example_secrets_in_production", {
      variables: weak,
      fix: "Générez des valeurs aléatoires (openssl rand -hex 32) ou démarrez via Docker.",
    });
  }
}
