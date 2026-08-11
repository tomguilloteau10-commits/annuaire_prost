#!/bin/sh
set -e

# Applique toutes les migrations (y compris la migration PostGIS manuelle,
# qui est un dossier de migration Prisma normal — voir
# prisma/migrations/*_add_postgis_city_geo/). `docker compose up` reproduit
# donc l'état complet de la base sans étape manuelle oubliée.
npx prisma migrate deploy

exec "$@"
