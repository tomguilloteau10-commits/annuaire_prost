# VelvetGirl — consignes pour Claude

Ce fichier est lu automatiquement par Claude Code au début de chaque
session. Il résume ce qu'il faut savoir pour continuer le projet sans
rien casser. Les détails sont dans `ENGINEERING_RULES.md` (règles
juridiques et de sécurité), `docs/ARCHITECTURE.md` et
`docs/MISE-EN-LIGNE.md`.

## Le projet

VelvetGirl est un annuaire suisse, en bêta privée, de prestataires
indépendantes adultes (personnes majeures, exerçant librement). Le dépôt
GitHub s'appelle `annuaire_prost` (ancien nom de travail, visible aussi
dans quelques noms de cookies et de fichiers : ne pas les renommer).

## La personne avec qui vous travaillez

- Elle écrit en **français** : répondez en français, en la vouvoyant.
- Elle **n'est pas développeuse** : pas de jargon. Expliquez ce qui change
  pour elle (ce qu'elle verra sur le site), pas comment c'est codé.
  Donnez les commandes à taper une par une, complètes, prêtes à copier.
- Elle travaille sur un **MacBook**, dans le dossier `~/annuaire_prost_v2`,
  avec Docker Desktop.
- Ne demandez pas de confirmation pour du travail déjà demandé ; posez une
  question seulement quand la décision lui revient (texte légal, prix,
  choix visuel, dépense).
- Son adresse e-mail est privée : ne l'écrivez jamais dans le code, les
  commits ou un service externe.

## Façon de travailler

1. **Au début de chaque session** : `git pull --no-rebase origin
   claude/swiss-directory-platform-foundation-6ytxc6` (du travail a pu être
   fait depuis une autre session).
2. Travaillez **uniquement** sur la branche
   `claude/swiss-directory-platform-foundation-6ytxc6`. Commitez et poussez
   chaque étape terminée (`git push -u origin <branche>`). Ne créez
   **jamais** de pull request sans demande explicite.
3. **Pour voir le résultat sur le site local** : lancez `./mettre-a-jour.sh`
   depuis le dossier du projet. Le script récupère la branche, reconstruit
   le site dans Docker si besoin, relance le seed seulement si
   `prisma/seed.ts` a changé, puis affiche l'adresse. Le site est alors sur
   **http://localhost:3000**.
   - Le script reconstruit seulement ce qui est **commité**. Commitez
     avant de le lancer.
   - Si Docker n'est pas lancé : `open -a Docker`, attendez qu'il soit
     prêt (`docker info` répond), puis relancez.
   - La personne a aussi un raccourci `maj` qui lance ce même script.
4. Ne mettez **aucun identifiant de modèle d'IA** dans les commits, le
   code ou les fichiers du dépôt.
5. Ne commitez jamais `.env`, `backups/`, `storage/`, `.version-installee`
   ni aucun secret.

## Règles non négociables (détail : `ENGINEERING_RULES.md`)

- **Éditeur, pas agence** : le site publie des annonces. Il n'organise
  rien, ne fixe aucun prix ni rendez-vous et ne prend aucune commission.
- **Aucun paiement sur le site.** L'abonnement des annonceuses se règle en
  dehors du site (facture, TWINT, virement) et l'admin l'enregistre à la
  main. Aucune donnée bancaire n'est stockée.
- **Aucune publication sans vérification 18+ faite par une personne**
  (admin), ni sans modération humaine des textes et des photos. Aucune
  décision automatique sur un signalement.
- **Coordonnées protégées** : téléphone, e-mail, WhatsApp et Instagram ne
  doivent jamais figurer dans le HTML initial ni dans l'API publique. Ils
  ne s'obtiennent qu'au clic sur « Afficher le contact » (route dédiée,
  limitée en débit, journalisée avec IP hachée).
- **Pièces d'identité** : visibles par l'admin seulement, chiffrées
  (AES-256-GCM) et supprimées dès la décision, ou au plus tard après
  30 jours. Seul le résultat est gardé.
- **IP jamais en clair** : toujours hachées (`src/lib/ip-hash.ts`). Aucune
  donnée sensible dans les journaux (`src/lib/logger.ts` ; `console.*` est
  interdit par le lint).
- **Localisation à la ville uniquement**, jamais d'adresse exacte.
- **Photos** : réencodées à l'envoi, sans métadonnées EXIF ni GPS
  (`src/modules/media/sanitize-image.ts`). Inaccessibles tant qu'elles ne
  sont pas validées.
- **Données de test synthétiques uniquement** (domaines `example.test`,
  images générées) : jamais de vraies personnes ni de vraies photos.
- **Porte 18+** : tout le site public et les API publiques exigent le
  cookie `vg_adult` (sauf la page d'âge et les pages légales). Voir
  `src/proxy.ts`, `src/lib/age-gate.ts` et `checkAgeConfirmed`.
- **Rôles séparés** : chaque page et chaque API vérifie le rôle
  (`requireRole`). Le test `tests/invariants/role-spaces.test.ts` le
  contrôle.

Les tests de `tests/invariants/` traduisent ces règles. Ils doivent
toujours passer et ne doivent jamais être affaiblis pour faire passer une
modification.

## Technique

- **Pile** :
  - Next.js 16 (App Router, Turbopack ; le middleware s'appelle
    `src/proxy.ts`) et React 19 ;
  - next-intl 4, Prisma 5 et PostgreSQL + PostGIS ;
  - zod 4, sharp, maplibre-gl 6, vitest et ESLint 9 (flat config).
- **API asynchrones de Next 16** : `cookies()` est asynchrone, donc
  `checkCsrf`, `assertValidCsrf` et `ensureCsrfCookie` s'utilisent avec
  `await`.
- **Langues** : fr, en, de et it, dans `src/i18n/messages/*.json`. Toute
  nouvelle clé doit être ajoutée **dans les 4 langues**. Les pages légales
  existent en français seulement (le français fait foi). Les autres
  langues affichent un avertissement.
- **Base de données** : les migrations sont écrites à la main dans
  `prisma/migrations/AAAAMMJJ0000NN_nom/migration.sql`, en suivant la
  numérotation. Elles s'appliquent toutes seules au démarrage du
  conteneur.
- **Fonctionnalités masquées** : Salons et Cam Live sont désactivés dans
  `src/lib/features.ts`. Ne les réactivez pas sans demande.
- **E-mails** : le service SMTP est utilisé si `SMTP_HOST` est défini.
  Sinon, les e-mails vont dans une boîte de test visible dans
  `/admin/outbox`.
- **Design** : élégant et sobre. Le mode sombre doit rester discret. Les
  polices sont locales (`src/fonts`), sans Google Fonts. Les animations
  d'apparition passent par `src/components/ui/Reveal.tsx`.
- **Textes légaux** :
  - fichiers : `src/content/legal/` ;
  - infos de l'exploitant à compléter dans `operator.ts` ;
  - bandeau « brouillon » tant que `LEGAL_DRAFT` vaut `true` ;
  - si une règle de traitement des données change, mettez aussi à jour
    la politique de confidentialité ;
  - si les conditions changent de façon importante, changez aussi
    `LEGAL_VERSION`.

### Vérifier avant de commiter

Avec Docker lancé, la base est accessible sur `localhost:5432`. Lancez :

```
npm run lint && npm run typecheck
(set -a && . ./.env && set +a && npx vitest run)
```

Si Node.js n'est pas installé sur le Mac (`node -v` échoue), demandez à
la personne avant d'installer quoi que ce soit. À défaut, la
reconstruction par `./mettre-a-jour.sh` vérifie au moins les types.
Après une modification visible, ouvrez le site pour vérifier le rendu.

## Où en est le projet

**Fait** :
- annuaire, carte, fiches, inscription et tableau de bord des
  annonceuses ;
- vérification 18+ manuelle, modération et signalements ;
- abonnement manuel, administration complète ;
- porte 18+, pages légales (brouillons) et consentements ;
- mot de passe oublié, suppression de compte ;
- configuration de production (Caddy/HTTPS) ;
- sauvegardes chiffrées et guide de mise en ligne.

**En attente de la personne** :
- **Informations légales de l'exploitant** : nom, adresse, e-mail,
  numéro IDE, responsable, hébergeur, service d'e-mail, prix de
  l'abonnement, for.
- **Relecture des textes légaux** par un juriste, puis `LEGAL_DRAFT` à
  `false`.
- **Prestataires** : choix de l'hébergeur (qui doit accepter les annonces
  pour adultes), du nom de domaine, du service SMTP et du stockage externe
  des sauvegardes.
- **Identité visuelle** : logo et favicon. L'orthographe reste à trancher
  entre « VelvetGirl » et « VelvetGrl ».

**Restant possible** (à proposer, sans le commencer de soi-même) :
- retirer le badge « Version bêta privée » ;
- décider de l'indexation par les moteurs de recherche (actuellement
  `noindex`) ;
- ajouter les coordonnées de paiement dans le message d'abonnement ;
- demander aux comptes existants d'accepter les conditions ;
- journaliser les consultations de pièces d'identité par l'admin ;
- ajouter une page de ressources d'aide.
