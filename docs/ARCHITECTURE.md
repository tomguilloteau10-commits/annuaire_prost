# Architecture

Ce document explique les choix structurants posés dans l'ossature et où
brancher, plus tard, les pièces non implémentées en bêta. Il est
volontairement court : à compléter au fur et à mesure des étapes
"abstractions" et "parcours".

## `src/modules/` — logique métier découplée du framework

Toute la logique métier vit dans `src/modules/<domaine>/`, en TypeScript
pur, appelée depuis les route handlers Next.js (`src/app/api/**/route.ts`)
ou les Server Components. Rien dans ces modules n'importe directement
`next/server` ou des types propres à Next : si le projet migre un jour vers
un backend séparé (NestJS ou autre), ce dossier se déplace quasiment tel
quel.

État actuel :

- `modules/auth/` : mots de passe (argon2id), sessions opaques
  (cookie + hash en base), RBAC (`GUEST` < `CLIENT`/`PROVIDER` <
  `MODERATOR` < `ADMIN`).
- `modules/retention/` : politique de rétention/purge data-driven (table
  `DataRetentionPolicy`), consommée par `scripts/purge-expired-data.ts`.
- `modules/verification/` : interface `VerificationProvider`
  (`types.ts`), implémentation bêta `MockVerificationProvider`, service
  d'orchestration DB ↔ provider (`verification.service.ts`) et factory
  `getVerificationProvider()` (`index.ts`) — le seul endroit qui lit
  `VERIFICATION_PROVIDER` pour choisir l'implémentation.
- `modules/media/` : interface `MediaStorage` (`types.ts`),
  implémentation bêta `LocalMediaStorage` (disque local, URLs signées
  HMAC courte durée), service métier (`media.service.ts`, gère aussi la
  limite de photos par plan) et factory `getMediaStorage()` (`index.ts`).
- `modules/moderation/` : `moderation-queue.service.ts` (la file est
  dérivée des statuts `PENDING`/`PENDING_REVIEW`, pas une table à part) et
  `audit-log.service.ts`.
- `modules/entitlements/` : lecture typée (zod) de `Plan.features`,
  helpers comme `canUploadMorePhotos()`.
- `modules/profiles/` : `profile.service.ts` (upsert du profil propre,
  soumission à la modération, lecture publique — `contact` n'apparaît
  jamais dans les `select` publics) et `contact-reveal.service.ts` (seul
  point d'accès à `ProfileContact` pour un visiteur).
- `modules/onboarding/` : `attestation.service.ts` — enregistrement
  horodaté et idempotent de l'attestation, bloquant pour la publication au
  même titre que la vérification 18+.
- `modules/taxonomies/` : `taxonomy.service.ts` — lecture/écriture des 4
  taxonomies (désactivation plutôt que suppression, jamais de perte de
  référence).

## Points de branchement futurs

| Aujourd'hui (bêta)                              | Remplaçable par                                      | Interface de découplage |
|--------------------------------------------------|-------------------------------------------------------|--------------------------|
| `MockVerificationProvider`                        | Sumsub, Veriff, PXL Vision, e-ID suisse               | `VerificationProvider` (`modules/verification/types.ts`) |
| Stockage média local (dossier / volume Docker)    | S3 / object storage compatible S3                     | `MediaStorage` (`modules/media/types.ts`) |
| Plan unique "Founder" gratuit                     | Abonnement B2B payant (jamais une commission — voir ENGINEERING_RULES.md §3-4) | `Plan` + `features: Json` (déjà en base) |
| Rate limiting en mémoire (`lib/rate-limit.ts`)    | Backend partagé (Redis `INCR`/`EXPIRE`)                | Signature `checkRateLimit()` inchangée |
| Géo-restriction basée sur un en-tête HTTP         | Vraie résolution GeoIP (reverse proxy MaxMind, ou en-tête CDN natif) | `GEO_COUNTRY_HEADER` (voir `src/middleware.ts`) |
| Pas de messagerie/chat, avis, réservation, IA      | Fonctionnalités hors périmètre bêta, volontairement absentes | — |

## Taxonomies i18n : `Json` maintenant, table de traductions plus tard

Les libellés multilingues des taxonomies (`Category.label`, `Service.label`,
`Language.label`) sont stockés en `Json` (`{ fr, en, de, it }`) plutôt que
dans une table `Translation` séparée. C'est un choix délibéré pour la bêta,
pas un oubli :

- **Pourquoi ce choix maintenant** : le nombre de langues est fixe et connu
  (FR/EN/DE/IT), le volume de taxonomies est faible (quelques dizaines de
  lignes), et aucun besoin de recherche full-text par langue n'existe
  encore. Une table de traductions ajouterait une jointure et une
  complexité de requête sans bénéfice mesurable à ce stade.
- **Quand migrer** : si (a) le nombre de langues devient variable ou grand
  (marché au-delà de la Suisse), ou (b) un besoin de recherche/indexation
  full-text par langue apparaît (ex: recherche de services en texte libre),
  migrer vers un modèle `Translation { entityType, entityId, locale, field,
  value }` avec un index sur `(entityType, entityId, locale)`. La migration
  est mécanique : un script lit les `Json` existants et les éclate en
  lignes ; aucune règle métier ne dépend du format `Json` actuel au-delà de
  la couche de lecture des taxonomies (`modules/taxonomies/`), donc le
  changement reste localisé.

## Géo-restriction : pourquoi un stub honnête en bêta

`src/middleware.ts` tourne en runtime Edge (contrainte Next.js pour le
middleware) et ne peut donc pas interroger Postgres/Prisma directement. Il
lit un code pays dans un en-tête HTTP configurable et le compare à un cache
en mémoire, rafraîchi depuis une route Node.js interne
(`/api/internal/allowed-countries`) qui, elle, interroge la table
`AllowedCountry`. Sans reverse proxy posant cet en-tête à partir d'une vraie
base GeoIP, la géo-restriction est un no-op (elle laisse passer) — un choix
délibéré : pour une bêta privée non référencée, un faux-négatif (laisser
passer) est un risque acceptable, un faux-positif (bloquer un accès
légitime sur une dépendance non branchée) ne l'est pas.

## Rétention/purge : posé dès le schéma, pas rétrofitté

Voir ENGINEERING_RULES.md "Politique de rétention/purge". La table
`DataRetentionPolicy` et les champs `purgeAt`/`ipHashPurgeAt` du schéma
existent dès cette étape, avant même que tous les flux qui les alimentent
soient construits, pour qu'aucune donnée à durée de vie limitée n'ait à
être "rattrapée" plus tard par une migration corrective.
