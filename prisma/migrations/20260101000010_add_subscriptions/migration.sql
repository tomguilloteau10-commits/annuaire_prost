-- Abonnements (statut uniquement, paiement hors plateforme).
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'PAYMENT_DUE', 'ACTIVE', 'PAUSED');

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "paymentDueSince" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_profileId_key" ON "Subscription"("profileId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Profils déjà existants : essai gratuit de 30 jours à partir de cette mise
-- à jour (personne ne disparaît de l'annuaire du jour au lendemain).
INSERT INTO "Subscription" ("id", "profileId", "status", "trialEndsAt", "updatedAt")
SELECT 'sub_' || md5(random()::text || p."id"), p."id", 'TRIAL', NOW() + INTERVAL '30 days', NOW()
FROM "ProviderProfile" p;
