#!/bin/sh
set -e

# ── Secrets ─────────────────────────────────────────────────────────────
# Si un secret manque ou garde la valeur d'exemple publique de
# .env.example ("change-me…"), une valeur aléatoire est générée UNE fois
# et conservée dans un volume dédié (/app/secrets), puis réutilisée à
# chaque démarrage : la clé de chiffrement des pièces d'identité ne change
# donc pas d'un redémarrage à l'autre. Un secret réel fourni dans .env est
# toujours prioritaire. Voir ENGINEERING_RULES.md §5.
SECRETS_FILE=/app/secrets/runtime.env
mkdir -p /app/secrets
touch "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"
for NAME in SESSION_SECRET CSRF_SECRET APP_IP_HASH_SECRET MEDIA_SIGNING_SECRET DOCUMENT_ENCRYPTION_KEY; do
  eval "CURRENT=\${$NAME:-}"
  case "$CURRENT" in
    ""|*change-me*)
      STORED=$(grep "^$NAME=" "$SECRETS_FILE" | head -n 1 | cut -d= -f2-)
      if [ -z "$STORED" ]; then
        STORED=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
        echo "$NAME=$STORED" >> "$SECRETS_FILE"
        echo "docker-entrypoint: $NAME généré automatiquement (valeur d'exemple remplacée)."
      fi
      export "$NAME=$STORED"
      ;;
  esac
done

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

# Purge des données à durée de vie limitée (pièces d'identité non traitées
# après 30 jours, hash d'IP, sessions expirées…) à chaque démarrage, en
# plus de la purge périodique faite par l'application. Un échec ne bloque
# pas le démarrage.
npm run --silent db:purge-expired || echo "docker-entrypoint: purge non effectuée (voir les logs ci-dessus)."

exec "$@"
