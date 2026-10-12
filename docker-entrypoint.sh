#!/bin/sh
set -e

# Applique toutes les migrations (y compris la migration PostGIS manuelle,
# qui est un dossier de migration Prisma normal — voir
# prisma/migrations/*_add_postgis_city_geo/). `docker compose up` reproduit
# donc l'état complet de la base sans étape manuelle oubliée.
#
# Réessaie plusieurs fois avant d'abandonner : `depends_on: condition:
# service_healthy` garantit que Postgres a démarré, mais pas que le réseau
# interne entre conteneurs est déjà routable à la milliseconde près —
# constaté notamment sur Docker-in-Docker imbriqué (GitHub Codespaces).
# `prisma migrate deploy` est sans effet de bord s'il échoue avant d'avoir
# pu se connecter, le réessayer est donc sûr.
MAX_ATTEMPTS=30
ATTEMPT=0
until npx prisma migrate deploy; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "docker-entrypoint: base de données injoignable après $MAX_ATTEMPTS tentatives, abandon." >&2
    exit 1
  fi
  echo "docker-entrypoint: base de données pas encore joignable (tentative $ATTEMPT/$MAX_ATTEMPTS), nouvel essai dans 2s..."
  sleep 2
done

exec "$@"
