-- Fiche prestataire enrichie (tous les champs facultatifs) : tatouages,
-- piercings, origine, rayon de déplacement, clientèle acceptée, moyens de
-- paiement (information seule), salon de rattachement. Écrite à la main :
-- `prisma migrate diff` proposerait aussi de supprimer City.geo (PostGIS).

ALTER TABLE "ProviderProfile"
    ADD COLUMN "travelRadiusKm" INTEGER,
    ADD COLUMN "tattoos" BOOLEAN,
    ADD COLUMN "piercings" BOOLEAN,
    ADD COLUMN "origin" TEXT,
    ADD COLUMN "clientele" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "paymentMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "salonSlug" TEXT;
