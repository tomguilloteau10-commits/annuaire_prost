-- Acceptation des conditions et consentement exprès (données sensibles).
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
ALTER TABLE "User" ADD COLUMN "sensitiveDataConsentAt" TIMESTAMP(3);
