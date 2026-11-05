-- Caractéristiques supplémentaires du profil, toutes facultatives et filtrables.
ALTER TABLE "ProviderProfile" ADD COLUMN "cupSize" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "pubicHair" TEXT;
ALTER TABLE "ProviderProfile" ADD COLUMN "rateFrom" INTEGER;
ALTER TABLE "ProviderProfile" ADD COLUMN "contactMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];
