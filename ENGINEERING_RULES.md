# Règles d'ingénierie — Annuaire Prost

Ces règles sont des invariants **juridiques et de sécurité**, pas des
préférences de style. Elles priment sur toute considération de rapidité de
développement. Toute Pull Request qui les enfreint doit être refusée, même
si elle « marche ».

Ce document est volontairement concret : chaque règle pointe vers son
emplacement de mise en œuvre dans le code, pour qu'un futur contributeur
puisse vérifier — pas seulement lire — l'invariant.

---

## 1. Rétention minimale sur l'identité

On ne conserve **jamais durablement** : image de document d'identité,
numéro de document, selfie/vidéo de vérification, données biométriques,
date de naissance. Le résultat de la vérification est la seule trace
permanente : `isAdult`, un identifiant opaque, un type de document, un pays
émetteur, la date de vérification, une date d'expiration.

**Exception encadrée (vérification manuelle par l'admin)** : pour que
l'admin puisse contrôler la majorité à la main, la prestataire dépose le
recto/verso de sa pièce d'identité (et, facultativement, un permis de
travail / contrat). Ces fichiers sont stockés **temporairement**, aux
conditions suivantes, toutes obligatoires :

- chiffrés au repos (AES-256-GCM, clé `DOCUMENT_ENCRYPTION_KEY` ou dérivée
  de `SESSION_SECRET`) dans `VerificationDocument` — jamais sur le disque
  des médias, jamais dans un bucket public ;
- lisibles **uniquement** par le rôle ADMIN, via
  `GET /api/admin/verification-documents/[id]` (réponse `no-store`,
  `nosniff`) ; aucune route publique ni prestataire ne les renvoie, même à
  leur propriétaire ;
- **supprimés au moment de la décision** de l'admin (validation ou refus),
  dans la même transaction que l'enregistrement du résultat ;
- supprimés d'office au plus tard après 30 jours sans décision
  (`purgeExpiredVerificationDocuments`, catégorie de rétention
  `verification_document`) — le dossier passe alors en `EXPIRED` ;
- aucun champ « numéro de document » ou « date de naissance » n'est saisi
  ni stocké : l'admin ne relève que type de document + pays.

Mise en œuvre :

- `prisma/schema.prisma` → `VerificationRecord` (résultat seul) et
  `VerificationDocument` (fichier chiffré temporaire, `purgeAt` obligatoire).
- `src/modules/verification/document-crypto.ts` : chiffrement/déchiffrement.
- `src/modules/verification/manual-review.service.ts` : dépôt, files admin,
  décisions (`decideIdentity`, `decideWorkPermit`) qui suppriment les
  fichiers.
- `src/modules/verification/document-retention.ts` : purge à 30 jours,
  appelée par `scripts/purge-expired-data.ts` et à chaque ouverture des
  files admin.
- **Test automatisé** : `tests/invariants/verification-documents.test.ts`
  — chiffrement, suppression des fichiers à la validation et au refus,
  purge à échéance, profil non publié tant que l'identité n'est pas validée.
- **Test automatisé** : `tests/invariants/no-forbidden-fields-in-schema.test.ts`
  échoue si un champ `birthDate`, `documentNumber`, `documentImage`,
  `selfieImage`, `biometricData` (ou variante) apparaît dans le schéma.

## 2. Aucune publication sans vérification 18+ validée par l'admin

La majorité (18+) n'est **jamais** validée automatiquement : ni par la
prestataire (aucune case « je suis vérifiée »), ni par le système. Seul un
compte ADMIN, après contrôle visuel des documents, passe le
`VerificationRecord` en `VERIFIED` (`decideIdentity`). Il n'existe aucun
autre chemin de code qui écrit ce statut.

La prestataire peut **envoyer** son profil pendant que ses documents sont
en attente ; il reste alors `PENDING_REVIEW` et n'est jamais visible
publiquement tant que `VerificationRecord.isAdult !== true` **et** que la
modération n'a pas validé (`ProviderProfile.status === PUBLISHED`). Le
passage « Disponible maintenant » est lui aussi refusé tant que
l'identité n'est pas validée. Pas d'exception, pas de contournement admin
silencieux — une suspension ou une dépublication reste possible, mais
toute republication repasse par les deux mêmes conditions.

Mise en œuvre : `modules/profiles/profile.service.ts` →
`listPublishedProfiles()` / `getPublishedProfileBySlug()` filtrent
systématiquement sur `status = "PUBLISHED"` ; `setOwnAvailability()`
refuse « en ligne » sans identité validée ;
`modules/moderation/moderation-queue.service.ts` → `decideOnProfile()`
revérifie `hasPassedAdultVerification()` avant toute approbation,
indépendamment de ce qu'affiche l'UI de modération. Tests d'intégration
(vraie base) : `tests/invariants/unverified-profile-not-public.test.ts` et
`tests/invariants/verification-documents.test.ts`.

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

Aucun flux d'argent entre client et prestataire. Aucun module de paiement.
Aucune intégration Stripe/PayPal/autre PSP, aucun formulaire de carte.

**Abonnement de publicité (prestataire → plateforme)** : géré par statut
uniquement (`model Subscription`, `src/modules/subscriptions`). Essai
gratuit de 30 jours à la création du profil ; le règlement se fait HORS
plateforme (facture, TWINT, virement) et l'admin enregistre seulement
« payé » (30 jours actifs) ou « en pause ». Aucun montant, moyen de
paiement ni donnée bancaire n'est stocké. Un abonnement en pause, ou
impayé plus de 7 jours après l'échéance, retire le profil de toutes les
lectures publiques (`publiclyVisibleProfileWhere`) sans le supprimer ni
le modifier. Un paiement ne remplace jamais la vérification d'âge ni la
modération (§2). Tests : `tests/invariants/subscription-visibility.test.ts`.

## 5. Protection des données sensibles

Téléphone, email, WhatsApp, Instagram et adresse exacte n'apparaissent
**jamais** dans les logs, messages d'erreur, payloads d'analytics ou query
strings. Le contact n'est jamais inclus dans le HTML de la page publique ni
dans une réponse d'API de liste : il est servi par un endpoint dédié
« révéler le contact », à la demande, avec rate limiting.

Mise en œuvre :

- `prisma/schema.prisma` → `model ProfileContact` : table séparée de
  `ProviderProfile` (défense en profondeur — un `select` large sur le
  profil ne peut structurellement pas ramener le contact). Les champs
  `whatsapp`/`instagram` suivent exactement la même protection que
  `phone`/`email` — même table, même service d'accès, même masquage dans
  les logs.
- `src/modules/profiles/contact-reveal.service.ts` : seul point d'accès à
  `ProfileContact`.
- `src/lib/logger.ts` : logger qui refuse/masque les clés sensibles
  (`phone`, `email`, `ipHash` en clair source, etc.) avant écriture.
- `eslint-rules/no-sensitive-log-fields.js` : règle de lint qui interdit
  `console.log`/`logger.*` avec un objet contenant littéralement une clé
  `phone`, `email`, `address`, `dateOfBirth`.
- Test d'intégration (vraie base) `tests/invariants/contact-not-leaked.test.ts` :
  crée un profil publié avec un contact réel, vérifie que ni
  `listPublishedProfiles()` ni `getPublishedProfileBySlug()` ne
  l'exposent, et que `revealContact()` refuse un profil non publié.
- Test unitaire (sans DB) `tests/invariants/no-sensitive-data-in-logs.test.ts` :
  vérifie au runtime que `logger.*` masque les champs sensibles, y compris
  imbriqués dans des objets ou des tableaux.

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

Mise en œuvre :

- `src/modules/media/types.ts` : interface `MediaStorage` — la génération
  d'URL signée est le seul chemin de lecture prévu par le contrat.
- `src/modules/media/media.service.ts` → `getPublicPhotoUrl()` : seule
  fonction autorisée à appeler `storage.getSignedUrl()`, et uniquement si
  `Media.status === "APPROVED"`. Aucun autre chemin de code ne génère
  d'URL de média.
- `src/app/api/media/serve/route.ts` : pour le stockage local, double
  vérification à chaque requête — signature/expiration du jeton, PUIS
  statut de modération en base — avant de servir le fichier. Documenté
  comme défense en profondeur spécifique au stockage local : un backend S3
  s'appuierait uniquement sur la vérification au moment de la génération
  de l'URL (voir commentaire dans `modules/media/types.ts`).
- Test `tests/modules/media/local-storage.test.ts` couvre la signature/
  expiration des jetons (unitaire, sans DB) ; test d'intégration (vraie
  base) `tests/invariants/unmoderated-media-inaccessible.test.ts` : vérifie
  que `getPublicPhotoUrl()` renvoie `null` pour un média `PENDING` ou
  `REJECTED`, et une URL pour un média `APPROVED`.

## 7. Toute décision automatique passe par un humain

Aucune suspension/rejet de profil ou de média entièrement automatisé : le
système signale et met en file d'attente (`ModerationQueue`), un humain
décide. Chaque action de modération produit une raison et est journalisée
(`ModerationAction`, `AuditLog`).

Mise en œuvre : `src/modules/moderation/moderation-queue.service.ts` —
`decideOnProfile()`/`decideOnMedia()` exigent un `moderatorId` et une
`reason` non vide (`ModerationReasonRequiredError` sinon), et sont les
seules fonctions habilitées à faire passer un profil à `PUBLISHED` ou un
média à `APPROVED`. `decideOnProfile()` revérifie
`hasPassedAdultVerification()` avant toute approbation — une décision
humaine positive ne suffit jamais seule si la vérification 18+ n'est plus
valide (contrainte #2), même si l'UI de modération ne devrait présenter
que des profils déjà vérifiés. `audit-log.service.ts` assainit
`metadata` avec la même liste de champs sensibles que `lib/logger.ts`
avant d'écrire dans `AuditLog`.

Les signalements de visiteurs (`ProfileReport`, lien « Signaler ce
profil ») suivent la même règle : `src/modules/reports/report.service.ts`
les met en file sans jamais toucher au profil signalé ; `resolveReport()`
exige une note et journalise la clôture. Aucune donnée sur l'auteur du
signalement n'est stockée (pas de compte, pas d'IP ni de hash d'IP).

## 8. Localisation approximative

On stocke et affiche la ville (`City`), jamais l'adresse exacte d'une
prestataire. `ProviderProfile` n'a pas de champ d'adresse ; la précision
géographique (PostGIS) sert la recherche par ville/distance entre villes,
pas la géolocalisation individuelle d'une personne.

---

## Données de test synthétiques uniquement

Aucune vraie donnée personnelle, aucun vrai document, aucune vraie photo
d'une personne réelle dans le dépôt ou en base — pas même en bêta, pas
même « juste pour tester ».

Mise en œuvre :

- `prisma/seed.ts` : les profils de démonstration (Léa, Nora, Camille)
  sont entièrement fictifs — noms, descriptions, coordonnées de contact
  (domaine `example.test`, réservé aux tests par la RFC 2606, jamais un
  domaine réel) et mots de passe de démonstration, documentés comme tels
  et à ne jamais utiliser hors d'une bêta privée non exposée.
- `scripts/lib/placeholder-png.ts` : les photos de démonstration sont des
  images générées (aplats de couleur unie), jamais une photo réelle
  téléchargée ou empruntée. Aucune dépendance externe, aucun fichier
  binaire versionné.
- Les comptes de démonstration passent par les mêmes chemins de code que
  n'importe quel compte réel (attestation, vérification, modération) —
  aucun raccourci ni contournement spécifique au seed dans le code
  applicatif.

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

## Anti-abus et durcissement (audit de sécurité)

- **Jamais de protection fondée sur l'IP seule** : l'IP vient d'un en-tête
  falsifiable tant que l'app n'est pas derrière un reverse proxy de
  confiance (`TRUSTED_PROXY_HOPS`, `lib/ip-hash.ts`). Chaque route sensible
  combine un seau par IP et un seau qui n'en dépend pas
  (`lib/rate-limit.ts`) :
  - connexion : 20 essais / 15 min par IP, et **8 mots de passe faux /
    15 min par compte** (verrouillage, quelle que soit l'IP) ; même durée
    de réponse que le compte existe ou non ;
  - inscription : 5 / 15 min par IP, 30 / heure au total ;
  - « Afficher le contact » : 20 / heure par IP, 300 / heure au total,
    réponse `no-store` ;
  - signalement : 5 / heure par IP, 60 / heure au total.
- **Envois de fichiers** : taille annoncée contrôlée AVANT lecture
  (`rejectOversizedUpload`), puis type réel (octets de signature).
- **Secrets** : jamais les valeurs d'exemple en production (générées
  automatiquement par `docker-entrypoint.sh`, alerte au démarrage sinon).
- **Réseau** : base et site liés à `127.0.0.1` dans `docker-compose.yml`.
- **Sessions** : 12 heures pour un compte admin, 30 jours pour une
  prestataire ; supprimées à l'expiration.
- **Erreurs** : Prisma en `errorFormat: "minimal"` (aucune valeur de
  requête recopiée dans les logs) ; pages d'erreur sans détail technique.
- **Purge** automatique au démarrage puis toutes les 6 heures
  (`modules/retention/purge.ts`).
- Tests : `tests/invariants/security-hardening.test.ts`.

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
