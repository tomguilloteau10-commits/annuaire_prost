#!/bin/sh
# Une sauvegarde complète, chiffrée : base de données, photos, et clés de
# l'application (dont la clé qui chiffre les pièces d'identité en attente).
#
# Fichier produit : /backups/velvetgirl_AAAA-MM-JJ_HHMMSS.tar.gz.enc
# Chiffrement AES-256 avec BACKUP_PASSPHRASE : sans cette phrase, la
# sauvegarde est illisible — gardez-la en lieu sûr, HORS du serveur.
set -eu
umask 077

: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE manquante dans .env}"
if [ "${#BACKUP_PASSPHRASE}" -lt 16 ]; then
  echo "backup: BACKUP_PASSPHRASE trop courte (16 caractères minimum)." >&2
  exit 1
fi
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP=$(date +%Y-%m-%d_%H%M%S)
TARGET="/backups/velvetgirl_${STAMP}.tar.gz.enc"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "backup: début ${STAMP}"
# La base peut annoncer « prête » un peu avant d'accepter les connexions
# (premier démarrage) : on attend jusqu'à 2 minutes.
for _ in $(seq 1 24); do pg_isready -q && break; sleep 5; done
pg_dump --format=custom --no-owner --file="$WORK/database.dump"
mkdir -p "$WORK/files"
[ -d /data/media ] && cp -a /data/media "$WORK/files/media"
[ -d /data/secrets ] && cp -a /data/secrets "$WORK/files/secrets"

tar -C "$WORK" -cf - database.dump files | gzip -6 \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$TARGET.part"
mv "$TARGET.part" "$TARGET"
echo "backup: écrit $(basename "$TARGET") ($(du -h "$TARGET" | cut -f1))"

# Rotation locale : on garde KEEP_DAYS jours.
find /backups -maxdepth 1 -name 'velvetgirl_*.tar.gz.enc' -mtime +"$KEEP_DAYS" -print -delete

# Copie hors du serveur (fortement recommandé) : voir BACKUP_REMOTE dans .env.
if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$TARGET" "$BACKUP_REMOTE"
  rclone delete --min-age "${KEEP_DAYS}d" --include 'velvetgirl_*.tar.gz.enc' "$BACKUP_REMOTE"
  echo "backup: copie hors site faite ($BACKUP_REMOTE)"
else
  echo "backup: ATTENTION — aucune copie hors du serveur (BACKUP_REMOTE vide)."
fi

date -Iseconds > /backups/last-success.txt
rm -f /backups/last-failure.txt
echo "backup: terminé"
