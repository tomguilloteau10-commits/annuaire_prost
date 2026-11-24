#!/usr/bin/env bash
# Met à jour VelvetGirl sur cet ordinateur, en une seule commande :
#
#   ./mettre-a-jour.sh        (depuis le dossier du projet)
#
# 1. récupère les dernières modifications ;
# 2. reconstruit et relance l'application si la version installée n'est
#    pas la dernière (les migrations de base de données s'appliquent
#    toutes seules au démarrage) ;
# 3. relance le remplissage de la base (seed) UNIQUEMENT si le fichier
#    prisma/seed.ts a changé depuis la version installée — jamais sinon.
#
# La version réellement installée est notée dans .version-installee
# (fichier local, non versionné) : même si un « git pull » a été fait à la
# main avant, la reconstruction n'est pas oubliée.
set -uo pipefail
cd "$(dirname "$0")"

BRANCH="claude/swiss-directory-platform-foundation-6ytxc6"
ETAT=".version-installee"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker n'est pas lancé. Ouvrez Docker Desktop, attendez qu'il soit prêt, puis relancez la commande."
  exit 1
fi

echo "① Récupération des dernières modifications…"
if ! git pull --no-rebase --no-edit origin "$BRANCH"; then
  echo "❌ La récupération a échoué (connexion internet, ou fichiers modifiés à la main dans le dossier)."
  echo "   Copiez le message ci-dessus et envoyez-le à Claude."
  exit 1
fi
ACTUELLE=$(git rev-parse HEAD)
INSTALLEE=$(cat "$ETAT" 2>/dev/null || true)

if [ "$ACTUELLE" = "$INSTALLEE" ]; then
  echo "✔ Déjà à jour : aucune nouveauté."
  docker compose up -d >/dev/null 2>&1
  echo "  Site : http://localhost:3000"
  exit 0
fi

echo "② Reconstruction et redémarrage de l'application (quelques minutes)…"
if ! docker compose up -d --build 2>&1 | tail -15; then
  echo "❌ La reconstruction a échoué. Copiez le message ci-dessus et envoyez-le à Claude."
  exit 1
fi

if [ -n "$INSTALLEE" ] && git diff --name-only "$INSTALLEE" "$ACTUELLE" 2>/dev/null | grep -q '^prisma/seed.ts$'; then
  echo "③ Mise à jour des données de base (seed)…"
  # L'application applique d'abord les migrations au démarrage : on
  # réessaie quelques fois le temps qu'elle soit prête.
  OK=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if docker compose exec -T app npm run db:seed; then OK=1; break; fi
    sleep 10
  done
  if [ "$OK" != 1 ]; then
    echo "❌ Le remplissage de la base a échoué. Copiez le message ci-dessus et envoyez-le à Claude."
    exit 1
  fi
fi

echo "$ACTUELLE" > "$ETAT"
echo ""
echo "✔ Mise à jour terminée. Site : http://localhost:3000"
