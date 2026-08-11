-- VerificationRecord.isAdult doit pouvoir être NULL tant que le résultat
-- n'est pas disponible (status PENDING/IN_PROGRESS) — un provider réel est
-- asynchrone (webhook), on ne peut pas connaître isAdult au moment où
-- l'enregistrement est créé.

ALTER TABLE "VerificationRecord" ALTER COLUMN "isAdult" DROP NOT NULL;
