#!/bin/bash
# Lancé une seule fois à la création du Codespace (postCreateCommand).
# Objectif : que la personne n'ait rien à taper — juste attendre et
# cliquer sur la notification "Open in Browser" quand le port 3000
# apparaît.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "==> Génération de .env avec des secrets aléatoires"
  cp .env.example .env
  for VAR in SESSION_SECRET CSRF_SECRET APP_IP_HASH_SECRET MEDIA_SIGNING_SECRET; do
    VALUE=$(openssl rand -hex 32)
    sed -i "s|^${VAR}=.*|${VAR}=\"${VALUE}\"|" .env
  done
fi

echo "==> Construction et démarrage des conteneurs (Postgres+PostGIS, app)"
echo "    Première fois : compte quelques minutes (npm install + build)."
docker compose up -d --build

echo "==> Attente que l'app réponde..."
for _ in $(seq 1 90); do
  if curl -sf http://localhost:3000/fr > /dev/null 2>&1; then
    echo "==> App prête."
    break
  fi
  sleep 2
done

echo "==> Peuplement de la base avec les données de démo (idempotent)"
docker compose exec -T app npm run db:seed

echo ""
echo "=========================================================="
echo " Prêt. Ouvre le port 3000 (notification en bas à droite,"
echo " ou onglet 'Ports' du terminal) pour voir l'application."
echo ""
echo " Comptes de démo (mot de passe : DemoPassword123!) :"
echo "   admin@example.test       -> modération / admin"
echo "   lea.demo@example.test    -> profil déjà publié"
echo "   camille.demo@example.test -> profil en attente de modération"
echo "=========================================================="
