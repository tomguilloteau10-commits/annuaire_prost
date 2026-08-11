# Règles d'ingénierie — Annuaire Prost

Ces règles sont des invariants **juridiques et de sécurité**, pas des
préférences de style. Elles priment sur toute considération de rapidité de
développement. Toute Pull Request qui les enfreint doit être refusée, même
si elle « marche ».

Ce document est volontairement concret : chaque règle pointe vers son
emplacement de mise en œuvre dans le code, pour qu'un futur contributeur
puisse vérifier — pas seulement lire — l'invariant.

---

## 1. Rétention zéro sur l'identité

On ne stocke **jamais** : image de document d'identité, numéro de document,
selfie/vidéo de vérification, données biométriques, date de naissance. On
stocke uniquement le **résultat** de la vérification : `isAdult`, un
identifiant opaque de vérification, un type de document, un pays émetteur,
un horodatage, une date d'expiration.

Mise en œuvre :

- `prisma/schema.prisma` → `model VerificationRecord` : liste exhaustive des
  champs autorisés, avec un bloc de commentaires explicite au-dessus du
  modèle.
- `prisma/schema.prisma` → `model User` : bloc de commentaires « INTERDIT »
  rappelant qu'aucun champ birthDate/documentNumber/documentImage/
  biometricData ne doit être ajouté nulle part dans le schéma.
- `src/modules/verification/types.ts` : le « contrat de résultat »
  (`VerificationResult`) que toute implémentation de `VerificationProvider`
  (y compris un futur Sumsub/Veriff/PXL Vision/e-ID suisse) doit respecter —
  il n'a physiquement pas de champ pour transporter un document.
- **Test automatisé** : `tests/invariants/no-forbidden-fields-in-schema.test.ts`
  lit `prisma/schema.prisma` comme texte et échoue si un champ nommé
  `dateOfBirth`, `birthDate`, `documentNumber`, `documentImage`,
  `idDocumentImage`, `selfieImage`, `biometricData` (ou variantes proches)
  y apparaît. Cet invariant est donc auto-vérifié à chaque CI, pas
  seulement documenté.

## 2. Aucune publication sans vérification 18+ passée

Un profil reste `DRAFT` / `PENDING_REVIEW` et n'est jamais visible
publiquement tant que `VerificationRecord.isAdult !== true` **et** que la
modération n'a pas validé (`ProviderProfile.status === PUBLISHED`). Pas de
« vérifier plus tard ». Pas d'exception, pas de contournement admin
silencieux — une suspension ou un dépublication reste possible, mais toute
republication repasse par les deux mêmes conditions.

Mise en œuvre : `modules/profiles/profile.service.ts` (la fonction qui
construit la requête de liste publique filtre systématiquement sur
`status = PUBLISHED`, jamais sur un flag modifiable indépendamment) ;
test `tests/invariants/unverified-profile-not-public.test.ts`.

## 3. Éditeur, pas agence

Le code ne contient **aucune** logique qui : fixe ou impose un prix de
service, impose des horaires/lieux, décide des clients, ou prélève une
commission sur un rendez-vous. Les prestataires sont des annonceuses
indépendantes. Toute monétisation future = abonnement de publicité
forfaitaire (`Plan`), jamais une commission sur transaction. Si une
fonctionnalité proposée ressemble à du contrôle sur le travail (planning
imposé, dispatching de clients, tarification centralisée), elle doit être
signalée et refusée plutôt que codée.

## 4. Aucun paiement de service sur la plateforme

Aucun flux d'argent entre client et prestataire. Aucun module de paiement
dans cette bêta. Aucune intégration Stripe/PayPal/autre PSP. L'abonnement
B2B futur (prestataire → plateforme, jamais client → prestataire via la
plateforme) est prévu dans le modèle (`Plan`) mais non implémenté.

## 5. Protection des données sensibles

Téléphone, email et adresse exacte n'apparaissent **jamais** dans les logs,
messages d'erreur, payloads d'analytics ou query strings. Le contact n'est
jamais inclus dans le HTML de la page publique ni dans une réponse d'API de
liste : il est servi par un endpoint dédié « révéler le contact », à la
demande, avec rate limiting.

Mise en œuvre :

- `prisma/schema.prisma` → `model ProfileContact` : table séparée de
  `ProviderProfile` (défense en profondeur — un `select` large sur le
  profil ne peut structurellement pas ramener le contact).
- `src/modules/profiles/contact-reveal.service.ts` : seul point d'accès à
  `ProfileContact`.
- `src/lib/logger.ts` : logger qui refuse/masque les clés sensibles
  (`phone`, `email`, `ipHash` en clair source, etc.) avant écriture.
- `eslint-rules/no-sensitive-log-fields.js` : règle de lint qui interdit
  `console.log`/`logger.*` avec un objet contenant littéralement une clé
  `phone`, `email`, `address`, `dateOfBirth`.
- Test `tests/invariants/contact-not-leaked.test.ts` et
  `tests/invariants/no-sensitive-data-in-logs.test.ts`.

### Hashage des IP — précisions

Toute IP qu'il est utile de conserver à des fins anti-abus (sessions,
attestation d'onboarding, révélation de contact) est **hashée, jamais
stockée en clair**. Deux règles supplémentaires, plus strictes que la
contrainte 5 elle-même, s'appliquent à ce hash :

1. **Salage obligatoire** : le hash est calculé avec un secret d'application
   (`APP_IP_HASH_SECRET`, HMAC-SHA256), jamais un hash nu de l'IP. Un hash
   non salé serait cassable par force brute étant donné le faible espace
   des adresses IPv4. Voir `src/lib/ip-hash.ts`.
2. **Rétention courte et purge active** : ces hash ne servent qu'au
   rate-limiting et à l'anti-abus, pas à l'archivage. Leur durée de vie est
   définie dans `DataRetentionPolicy` (valeurs par défaut en bêta : 90
   jours pour les sessions et l'attestation d'onboarding, 30 jours pour le
   journal de révélation de contact) et appliquée par
   `scripts/purge-expired-data.ts`. Les champs `ipHashPurgeAt` /
   `purgeAt` du schéma portent cette date.

## 6. Médias protégés

Les photos ne sont accessibles que via des URLs signées à durée de vie
courte. Un média non modéré (`Media.status !== APPROVED`) est inaccessible
publiquement, même avec une URL valide.

Mise en œuvre : `src/modules/media/types.ts` (interface `MediaStorage`,
la génération d'URL signée est le seul chemin de lecture) ; test
`tests/invariants/unmoderated-media-inaccessible.test.ts`.

## 7. Toute décision automatique passe par un humain

Aucune suspension/rejet de profil ou de média entièrement automatisé : le
système signale et met en file d'attente (`ModerationQueue`), un humain
décide. Chaque action de modération produit une raison et est journalisée
(`ModerationAction`, `AuditLog`).

## 8. Localisation approximative

On stocke et affiche la ville (`City`), jamais l'adresse exacte d'une
prestataire. `ProviderProfile` n'a pas de champ d'adresse ; la précision
géographique (PostGIS) sert la recherche par ville/distance entre villes,
pas la géolocalisation individuelle d'une personne.

---

## Politique de rétention/purge — vue d'ensemble

Ce projet part du principe qu'une politique de suppression rétrofittée
après coup est beaucoup plus difficile à garantir correcte qu'une politique
posée dès le modèle de données. Concrètement :

- `DataRetentionPolicy` (table éditable en base, pas en dur dans le code)
  définit une durée de rétention en jours par catégorie de donnée
  ancillaire.
- Les lignes qui portent une donnée à durée de vie limitée (`Session.ipHash`,
  `OnboardingAttestation.ipHash`, `ContactRevealLog`, `Media` rejeté,
  `VerificationRecord` au-delà de sa validité métier) portent un champ
  `purgeAt` / `ipHashPurgeAt` calculé à l'écriture à partir de cette
  politique.
- `scripts/purge-expired-data.ts` balaie ces champs et supprime/nullifie la
  donnée expirée. Le script existe et est testable dès la bêta ; le
  brancher sur un cron de production est une étape d'exploitation (voir
  README.md), pas une réécriture de schéma.

## Application des règles

- Revue de code : toute PR touchant `prisma/schema.prisma`,
  `src/modules/verification/`, `src/modules/media/`,
  `src/modules/profiles/contact-reveal.service.ts` ou `src/lib/logger.ts`
  doit être relue à la lumière de ce document.
- CI : `npm test` fait échouer le build si un invariant listé ci-dessus est
  rompu (voir `tests/invariants/`).
- En cas de conflit entre une demande produit et une règle de ce document,
  la règle prime — le désaccord doit être signalé, pas contourné en
  silence.
