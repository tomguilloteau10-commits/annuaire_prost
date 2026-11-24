#!/bin/sh
# Restaure une sauvegarde : base de données, photos et clés.
#
#   docker compose stop app
#   docker compose run --rm restore /backups/velvetgirl_AAAA-MM-JJ_HHMMSS.tar.gz.enc
#   docker compose start app
#
# ATTENTION : remplace TOUT le contenu actuel par celui de la sauvegarde.
set -eu
umask 077
FILE="${1:?Indiquez le fichier à restaurer, ex. /backups/velvetgirl_2026-01-31_033000.tar.gz.enc}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE manquante dans .env}"
[ -f "$FILE" ] || { echo "restore: fichier introuvable : $FILE" >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "restore: déchiffrement de $(basename "$FILE")"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$FILE" | gunzip | tar -C "$WORK" -xf -

echo "restore: base de données"
psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE)"
psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"$PGDATABASE\""
pg_restore --no-owner --exit-on-error -d "$PGDATABASE" "$WORK/database.dump"

echo "restore: photos et clés"
if [ -d "$WORK/files/media" ]; then
  find /data/media -mindepth 1 -delete
  cp -a "$WORK/files/media/." /data/media/
fi
if [ -d "$WORK/files/secrets" ]; then
  find /data/secrets -mindepth 1 -delete
  cp -a "$WORK/files/secrets/." /data/secrets/
fi
echo "restore: terminé. Relancez le site : docker compose start app"
