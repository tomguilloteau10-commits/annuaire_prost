-- Infos complémentaires de la page profil (toutes facultatives) : tarifs
-- indicatifs, caractéristiques, disponibilités. Écrite à la main : `prisma
-- migrate diff` proposerait aussi de supprimer City.geo (PostGIS, hors schéma).

ALTER TABLE "ProviderProfile"
    ADD COLUMN "heightCm" INTEGER,
    ADD COLUMN "bodyType" TEXT,
    ADD COLUMN "hairColor" TEXT,
    ADD COLUMN "eyeColor" TEXT,
    ADD COLUMN "rate30Min" INTEGER,
    ADD COLUMN "rate1Hour" INTEGER,
    ADD COLUMN "rate2Hours" INTEGER,
    ADD COLUMN "rateNight" INTEGER,
    ADD COLUMN "availableDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "availableFrom" TEXT,
    ADD COLUMN "availableTo" TEXT,
    ADD COLUMN "receives" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "travels" BOOLEAN NOT NULL DEFAULT false;

-- "Reçoit" / "Se déplace" étaient jusqu'ici deux services de la taxonomie
-- (incall / outcall). Ils deviennent des champs du profil, affichés dans
-- les disponibilités : on reprend les choix existants, on retire les liens,
-- et on désactive les deux services (désactivés, pas supprimés : un admin
-- garde la trace et peut les réactiver depuis "Catégories & villes").
UPDATE "ProviderProfile" p SET "receives" = true
WHERE EXISTS (
    SELECT 1 FROM "ProfileService" ps JOIN "Service" s ON s."id" = ps."serviceId"
    WHERE ps."profileId" = p."id" AND s."key" = 'incall'
);

UPDATE "ProviderProfile" p SET "travels" = true
WHERE EXISTS (
    SELECT 1 FROM "ProfileService" ps JOIN "Service" s ON s."id" = ps."serviceId"
    WHERE ps."profileId" = p."id" AND s."key" = 'outcall'
);

DELETE FROM "ProfileService" ps
USING "Service" s
WHERE s."id" = ps."serviceId" AND s."key" IN ('incall', 'outcall');

UPDATE "Service" SET "isActive" = false WHERE "key" IN ('incall', 'outcall');
