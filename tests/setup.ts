// Valeurs par défaut pour que les modules qui valident leur environnement
// (src/lib/env.ts) puissent être importés en test sans dépendre d'un vrai
// .env. Ne jamais utiliser ces valeurs ailleurs qu'en test.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.SESSION_SECRET ??= "test-session-secret-0123456789";
process.env.CSRF_SECRET ??= "test-csrf-secret-0123456789";
process.env.APP_IP_HASH_SECRET ??= "test-iphash-secret-0123456789";
process.env.MEDIA_SIGNING_SECRET ??= "test-media-secret-0123456789";
process.env.VERIFICATION_PROVIDER ??= "mock";
process.env.MEDIA_STORAGE_DRIVER ??= "local";
process.env.MEDIA_LOCAL_PATH ??= "./storage/media-test";
process.env.MEDIA_SIGNED_URL_TTL_SECONDS ??= "120";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
