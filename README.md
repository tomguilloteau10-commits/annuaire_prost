# Annuaire Prost — bêta privée

Annuaire suisse d'annonceuses indépendantes. Version bêta privée, hébergée
mais non référencée publiquement, testée avec 2-3 prestataires.

Avant de toucher au code, lisez **[`ENGINEERING_RULES.md`](./ENGINEERING_RULES.md)** :
les 8 contraintes qui y sont décrites (rétention zéro sur l'identité,
aucune publication sans vérification 18+, éditeur et non agence, aucun
paiement de service, protection des données sensibles, médias protégés,
décision automatique jamais seule, localisation approximative) priment sur
toute autre considération. Voir aussi
**[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)** pour les abstractions
et où brancher un vrai prestataire de vérification, du stockage cloud, etc.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind · PostgreSQL/PostGIS +
Prisma · next-intl (FR/EN remplis, DE/IT en structure) · Docker Compose.

## Démarrer en local (Docker Compose)

1. Copiez le fichier d'environnement et générez de vrais secrets :

   ```bash
   cp .env.example .env
   # Remplacez SESSION_SECRET, CSRF_SECRET, APP_IP_HASH_SECRET par des
   # valeurs aléatoires distinctes, ex :
   openssl rand -hex 32
   ```

2. Lancez la stack complète (Postgres+PostGIS, l'app) :

   ```bash
   docker compose up --build
   ```

   Au démarrage, le conteneur `app` exécute automatiquement
   `prisma migrate deploy` (voir `docker-entrypoint.sh`) avant de lancer le
   serveur : **toutes** les migrations sont appliquées, y compris la
   migration PostGIS manuelle (`prisma/migrations/20260101000001_add_postgis_city_geo/`)
   qui ajoute l'extension `postgis`, une colonne géographique sur `City` et
   son index GIST. `docker compose up` seul reproduit donc l'état complet de
   la base, sans étape manuelle oubliée.

3. L'app est disponible sur http://localhost:3000.

4. Seedez les données (dans un autre terminal, une fois la stack démarrée) :

   ```bash
   docker compose exec app npm run db:seed
   ```

### Développement sans rebuild Docker à chaque changement

Pour itérer rapidement sur le code, ne lancez que la base via Docker et
faites tourner l'app en local :

```bash
docker compose up db
npm install
cp .env.example .env   # DATABASE_URL doit pointer vers localhost:5432, déjà le cas par défaut
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Variables d'environnement

Voir `.env.example` pour la liste complète et leur rôle. Points
d'attention :

- `SESSION_SECRET`, `CSRF_SECRET`, `APP_IP_HASH_SECRET` : secrets distincts,
  jamais commités, jamais réutilisés entre environnements.
- `APP_IP_HASH_SECRET` sale le hash des adresses IP stockées (jamais d'IP
  en clair — voir ENGINEERING_RULES.md §5).
- `VERIFICATION_PROVIDER=mock` est la seule valeur supportée en bêta (voir
  `src/modules/verification/`).
- `GEO_COUNTRY_HEADER` (optionnel, défaut `x-geo-country`) : nom de l'en-tête
  HTTP que le middleware lit pour la géo-restriction. En self-hosting, ce
  header doit être posé par un reverse proxy équipé d'une base GeoIP (voir
  `src/middleware.ts` pour le détail — c'est un stub honnête, pas une
  géolocalisation réelle en bêta).

## Migrations & PostGIS

- `npm run prisma:migrate` : crée/applique une migration en dev (nécessite
  une base accessible).
- `npm run prisma:migrate:deploy` : applique les migrations existantes sans
  en générer de nouvelle (c'est ce que fait `docker-entrypoint.sh` au
  démarrage du conteneur).
- La colonne géographique de `City` (`geo geography(Point,4326)` + index
  GIST) est ajoutée par une migration Prisma **manuelle** (Prisma ne
  modélise pas nativement PostGIS), mais c'est une migration normale du
  point de vue de `prisma migrate deploy` — pas une étape à part.
- Les recherches par ville/distance passent par `$queryRaw` (Prisma ne sait
  pas typer les requêtes géographiques nativement).

## Purge des données à durée de vie limitée

`npm run db:purge-expired` (`scripts/purge-expired-data.ts`) balaie les
hash d'IP, journaux de révélation de contact, médias rejetés et journaux
d'audit de vérification arrivés en fin de rétention (durées définies dans
la table `DataRetentionPolicy`, éditable en base). Ce script est
fonctionnel dès la bêta ; il n'est pas encore branché sur un cron actif —
pour l'activer en production, planifiez son exécution périodique (ex: cron
système, tâche planifiée de votre hébergeur) plutôt que de le laisser
manuel.

## Tests

```bash
npm test
```

Les tests d'invariants critiques vivent dans `tests/invariants/` (voir
ENGINEERING_RULES.md pour la liste des invariants couverts). D'autres
suivront au fur et à mesure de l'avancement des parcours fonctionnels.

## Lint & typecheck

```bash
npm run lint
npm run typecheck
```

`npm run lint` inclut une règle locale
(`eslint-rules/no-sensitive-log-fields.js`) qui interdit de logger des
champs sensibles (téléphone, email, adresse, date de naissance, documents).

## État du projet

Ce dépôt pose l'**ossature** : configuration, Docker Compose, schéma de
base et migrations, authentification (sessions, RBAC, CSRF, rate limiting
de base), middleware (en-têtes de sécurité, géo-restriction stub), squelette
i18n. Les abstractions métier (`VerificationProvider`, `MediaStorage`,
`ModerationQueue`, entitlements), les parcours complets
(prestataire → vérification → profil → modération → publication →
affichage public) et le seed synthétique de démonstration sont les étapes
suivantes — voir `docs/ARCHITECTURE.md`.
