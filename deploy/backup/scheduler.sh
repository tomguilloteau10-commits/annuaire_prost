#!/bin/sh
# Lance une sauvegarde chaque jour à BACKUP_TIME (heure suisse par défaut),
# et tout de suite au démarrage si la dernière date de plus de 25 heures.
# En cas d'échec : deux nouveaux essais, à 10 minutes d'intervalle.
set -u
BACKUP_TIME="${BACKUP_TIME:-03:30}"

run_backup() {
  for attempt in 1 2 3; do
    if backup.sh; then return 0; fi
    echo "backup: ÉCHEC (essai $attempt/3)" >&2
    [ "$attempt" -lt 3 ] && sleep 600
  done
  date -Iseconds > /backups/last-failure.txt
  return 1
}

recent=$(find /backups -maxdepth 1 -name 'velvetgirl_*.tar.gz.enc' -mmin -1500 2>/dev/null | head -n 1)
[ -z "$recent" ] && run_backup

while true; do
  now=$(date +%s)
  next=$(date -d "today $BACKUP_TIME" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow $BACKUP_TIME" +%s)
  echo "backup: prochaine sauvegarde le $(date -d "@$next" '+%Y-%m-%d à %H:%M')"
  sleep $((next - now))
  run_backup
done
