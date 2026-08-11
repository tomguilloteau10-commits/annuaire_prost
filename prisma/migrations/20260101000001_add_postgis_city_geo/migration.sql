-- Migration manuelle (non générée par `prisma migrate dev`) : Prisma ne
-- modélise pas nativement les types géographiques PostGIS. Cette migration
-- fait partie de l'historique normal des migrations Prisma — `prisma
-- migrate deploy` l'applique comme n'importe quelle autre, donc
-- `docker compose up` reproduit l'état complet de la base sans étape
-- manuelle oubliée.
--
-- Recherche par ville/distance (contrainte #8 : localisation approximative
-- au niveau ville uniquement, jamais d'adresse exacte).

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "City" ADD COLUMN "geo" geography(Point, 4326);

-- Colonne générée à partir de lat/lng pour rester cohérente avec les deux
-- champs Float exposés à Prisma (lisibles/écrivables normalement par le
-- client), tout en gardant une colonne géographique indexable pour les
-- requêtes de distance en $queryRaw.
CREATE OR REPLACE FUNCTION city_set_geo_from_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geo := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.geo := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_geo_sync
BEFORE INSERT OR UPDATE OF lat, lng ON "City"
FOR EACH ROW
EXECUTE FUNCTION city_set_geo_from_lat_lng();

CREATE INDEX "City_geo_idx" ON "City" USING GIST ("geo");
