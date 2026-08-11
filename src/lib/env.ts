import { z } from "zod";

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
  return cachedEnv;
}
