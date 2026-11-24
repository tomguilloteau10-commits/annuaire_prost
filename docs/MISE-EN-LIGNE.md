# Mettre VelvetGirl en ligne — guide pas à pas

Ce guide part de zéro : un serveur vide, un nom de domaine, et à la fin un
site en HTTPS, sauvegardé chaque nuit, surveillé, et prêt à ouvrir.

Comptez **une demi-journée** la première fois. Les commandes sont à copier
**une par une** dans le terminal du serveur.

> Tout ce qui est décrit ici a été testé de bout en bout (démarrage à vide,
> HTTPS, compte admin, sauvegarde, effacement volontaire des données, puis
> restauration complète).

---

## 0. Ce qu'il vous faut (à réunir avant de commencer)

| Quoi | Pourquoi | Ordre de prix |
|------|----------|---------------|
| **Un serveur (VPS)** en Suisse, Ubuntu 24.04, 2 processeurs, 4 Go de mémoire, 40 Go de disque | Fait tourner le site | ~10 à 25 CHF / mois |
| **Un nom de domaine** (ex. `velvetgirl.ch`) | L'adresse du site | ~15 CHF / an |
| **Un service d'envoi d'e-mails (SMTP)** | E-mails « mot de passe oublié » | souvent inclus ou gratuit au début |
| **Un stockage externe compatible S3** (recommandé) | Copie des sauvegardes hors du serveur | quelques CHF / mois |
| **Un gestionnaire de mots de passe** (Bitwarden, 1Password…) | Garder les mots de passe et la phrase de sauvegarde | gratuit à quelques CHF |
| **Un service de surveillance** (UptimeRobot, Better Stack…) | Être prévenu si le site tombe | gratuit |

**Important — conditions de l'hébergeur.** Beaucoup d'hébergeurs interdisent
les annonces de services pour adultes, même légales. **Avant de payer**,
lisez leurs conditions d'utilisation (« acceptable use policy ») ou posez-leur
la question par écrit. Faites de même pour le service d'e-mail. Préférez un
hébergement en Suisse (données des annonceuses).

---

## 1. Préparer le serveur

Votre hébergeur vous donne une **adresse IP** et un accès **SSH**. Depuis le
Terminal de votre Mac :

```
ssh root@ADRESSE_IP_DU_SERVEUR
```

Puis, sur le serveur, une commande à la fois :

```
apt update && apt upgrade -y
```

```
apt install -y git ufw unattended-upgrades
```

Pare-feu — seuls SSH (22), HTTP (80) et HTTPS (443) restent ouverts :

```
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

Mises à jour de sécurité automatiques du système :

```
dpkg-reconfigure -f noninteractive unattended-upgrades
```

Installer Docker (script officiel) :

```
curl -fsSL https://get.docker.com | sh
```

Vérifier la version de Docker Compose (il faut **2.24 ou plus**) :

```
docker compose version
```

---

## 2. Relier le nom de domaine au serveur

Chez le fournisseur de votre nom de domaine, dans la zone DNS, créez :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` (le domaine seul) | l'adresse IP du serveur |
| A | `www` | l'adresse IP du serveur |

Si le serveur a aussi une adresse IPv6, ajoutez les mêmes lignes en type
`AAAA`. La prise en compte peut prendre de quelques minutes à quelques heures.
Pour vérifier depuis votre Mac : `ping velvetgirl.ch` doit répondre avec
l'adresse du serveur.

---

## 3. Installer le site sur le serveur

Récupérer le code (si le dépôt GitHub est privé, GitHub vous demandera un
identifiant : utilisez un « personal access token » en lecture seule à la
place du mot de passe) :

```
cd /opt && git clone https://github.com/tomguilloteau10-commits/annuaire_prost.git velvetgirl
```

```
cd /opt/velvetgirl && git checkout claude/swiss-directory-platform-foundation-6ytxc6
```

Créer le fichier de réglages à partir du modèle :

```
cp .env.production.example .env && chmod 600 .env
```

Générer les deux secrets dont vous aurez besoin (notez chaque résultat) :

```
openssl rand -hex 24
```

→ ce sera `POSTGRES_PASSWORD` (mot de passe de la base).

```
openssl rand -base64 32
```

→ ce sera `BACKUP_PASSPHRASE` (phrase des sauvegardes). **Copiez-la tout de
suite dans votre gestionnaire de mots de passe : sans elle, aucune sauvegarde
ne pourra jamais être restaurée.**

Ouvrir le fichier de réglages pour le remplir :

```
nano .env
```

À remplir : `DOMAIN`, `ACME_EMAIL`, `POSTGRES_PASSWORD`, `BACKUP_PASSPHRASE`,
les lignes `SMTP_…` (étape 5) et, si vous en avez un, le stockage externe
(étape 6). Laissez les lignes « change-me » telles quelles : ces secrets sont
générés automatiquement. Pour enregistrer dans `nano` : `Ctrl+O`, `Entrée`,
puis `Ctrl+X`.

---

## 4. Démarrer

```
docker compose up -d --build
```

La première fois, comptez 5 à 10 minutes. Pour voir où en sont les services :

```
docker compose ps
```

Les lignes `app`, `db`, `caddy` et `backup` doivent indiquer « Up »
(`app` et `db` : « healthy »).

Charger les données de base (catégories, villes, langues…) :

```
docker compose exec app npm run db:seed
```

Créer **votre** compte admin (avec votre vraie adresse e-mail). Cette commande
supprime aussi le compte de démonstration, dont le mot de passe est public :

```
docker compose exec app npm run admin:setup -- votre@adresse.ch
```

Le mot de passe s'affiche **une seule fois** : copiez-le dans votre
gestionnaire de mots de passe.

Ouvrez `https://votre-domaine.ch` : le cadenas HTTPS est en place
automatiquement (certificat gratuit, renouvelé tout seul). Connectez-vous
sur `/fr/login` avec votre compte admin.

---

## 5. Envoi des e-mails

Votre service d'e-mail vous donne : un serveur (host), un port (souvent 587),
un identifiant et un mot de passe. Renseignez-les dans `.env` :

```
SMTP_HOST=…
SMTP_PORT=587
SMTP_USER=…
SMTP_PASSWORD=…
SMTP_FROM="VelvetGirl <no-reply@votre-domaine.ch>"
```

Puis redémarrez le site :

```
docker compose up -d
```

**Test :** créez un compte prestataire de test avec une adresse que vous
consultez, cliquez sur « Mot de passe oublié ? » et vérifiez que l'e-mail
arrive (et pas dans les indésirables). Tant que le SMTP n'est pas configuré,
l'accueil de l'admin affiche un avertissement.

Conseil : chez votre fournisseur de domaine, activez les enregistrements
**SPF** et **DKIM** que votre service d'e-mail vous indique ; sans eux, les
e-mails finissent souvent en indésirables.

---

## 6. Sauvegardes

### Ce qui est sauvegardé, et quand

Chaque nuit à **03:30** (heure suisse), et au démarrage s'il n'y en a pas de
récente :

- la **base de données** complète (comptes, annonces, abonnements…) ;
- les **photos** ;
- les **clés de l'application** (dont celle qui chiffre les pièces d'identité
  en attente de contrôle).

Le tout est **chiffré** avec votre `BACKUP_PASSPHRASE` et rangé dans
`/opt/velvetgirl/backups`. Les **14 derniers jours** sont gardés
(`BACKUP_KEEP_DAYS`). En cas d'échec, deux nouveaux essais ont lieu à 10
minutes d'intervalle.

**Où le voir :** l'accueil de l'espace admin affiche « Sauvegardes
automatiques : dernière réussie le … », ou un avertissement si la dernière
réussite date de plus de 26 heures.

### Copie hors du serveur (fortement recommandé)

Une sauvegarde qui reste sur le serveur disparaît avec lui. Avec un stockage
compatible S3, remplissez dans `.env` :

```
BACKUP_REMOTE=offsite:nom-de-votre-bucket
RCLONE_CONFIG_OFFSITE_TYPE=s3
RCLONE_CONFIG_OFFSITE_PROVIDER=Other
RCLONE_CONFIG_OFFSITE_ENDPOINT=https://adresse-donnée-par-le-fournisseur
RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID=…
RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=…
```

Puis :

```
docker compose up -d
```

Chaque sauvegarde est alors copiée aussi à l'extérieur (déjà chiffrée).

### Faire une sauvegarde tout de suite

```
docker compose exec backup backup.sh
```

### Récupérer une sauvegarde sur votre Mac

Depuis le Terminal **de votre Mac** :

```
scp root@ADRESSE_IP_DU_SERVEUR:/opt/velvetgirl/backups/velvetgirl_*.enc ~/Desktop/
```

### Restaurer une sauvegarde

À faire uniquement en cas de besoin (perte de données, nouveau serveur). Cela
**remplace tout** par le contenu de la sauvegarde. Sur le serveur :

1. Voir les sauvegardes disponibles :

   ```
   ls /opt/velvetgirl/backups
   ```

2. Arrêter le site :

   ```
   docker compose stop app
   ```

3. Restaurer (remplacez le nom du fichier) :

   ```
   docker compose run --rm restore /backups/velvetgirl_2026-01-31_033000.tar.gz.enc
   ```

4. Relancer le site :

   ```
   docker compose start app
   ```

Avec une mauvaise phrase de sauvegarde, la restauration s'arrête avant de
toucher à quoi que ce soit.

**Sur un serveur neuf :** refaites les étapes 1 à 3 avec **la même**
`BACKUP_PASSPHRASE` et le même `POSTGRES_PASSWORD`, démarrez
(`docker compose up -d --build`), copiez le fichier de sauvegarde dans
`/opt/velvetgirl/backups`, puis suivez la restauration ci-dessus.

**Faites un essai de restauration avant l'ouverture**, puis une fois par
trimestre : une sauvegarde jamais testée n'est pas une sauvegarde.

---

## 7. Surveillance

Créez un contrôle dans votre service de surveillance (UptimeRobot, Better
Stack…) :

- type : HTTP(S) ;
- adresse : `https://votre-domaine.ch/api/health` ;
- fréquence : toutes les 5 minutes ;
- alerte : par e-mail (et SMS si possible).

Cette adresse répond « ok » quand le site **et** la base de données
fonctionnent.

---

## 8. Mettre à jour le site

Exactement comme sur votre Mac, depuis le dossier du site sur le serveur :

```
cd /opt/velvetgirl && ./mettre-a-jour.sh
```

Il récupère les nouveautés, reconstruit, applique les changements de base de
données et relance le site. Faites une sauvegarde juste avant les grosses
mises à jour (`docker compose exec backup backup.sh`).

---

## 9. Liste de contrôle avant l'ouverture au public

- [ ] Conditions de l'hébergeur et du service d'e-mail vérifiées (annonces pour adultes acceptées).
- [ ] Informations légales complétées (nom, adresse, e-mail, IDE, hébergeur, service d'e-mail, prix, for) — envoyez-les à Claude.
- [ ] Textes légaux relus par un·e juriste ; bandeau « projet » retiré.
- [ ] Votre compte admin créé (`admin:setup`) ; compte de démonstration supprimé.
- [ ] E-mails testés (mot de passe oublié reçu, hors indésirables).
- [ ] Sauvegarde réussie visible dans l'admin ; copie hors serveur active.
- [ ] **Restauration testée** au moins une fois.
- [ ] `BACKUP_PASSPHRASE` et mots de passe rangés dans le gestionnaire, hors du serveur.
- [ ] Surveillance active sur `/api/health`.
- [ ] Coordonnées de paiement dans le message d'abonnement des prestataires.
- [ ] Logo et icône d'onglet (à faire avec Claude).
- [ ] Bandeau « Version bêta privée » de l'accueil retiré, et décision prise sur le référencement Google (aujourd'hui volontairement désactivé) — à demander à Claude.
- [ ] Comptes et annonces de test supprimés.

---

## 10. En cas de problème

| Situation | Commande (dans `/opt/velvetgirl`) |
|-----------|-----------------------------------|
| Voir l'état des services | `docker compose ps` |
| Voir les messages du site | `docker compose logs --tail 100 app` |
| Voir les messages des sauvegardes | `docker compose logs --tail 50 backup` |
| Voir les messages HTTPS | `docker compose logs --tail 50 caddy` |
| Redémarrer le site | `docker compose restart app` |
| Tout redémarrer | `docker compose up -d` |
| Place disque restante | `df -h /` |

Le certificat HTTPS ne s'obtient pas ? Vérifiez que le nom de domaine pointe
bien vers le serveur (étape 2) et que les ports 80 et 443 sont ouverts
(étape 1), puis `docker compose restart caddy`.

Dans tous les cas : copiez le message affiché et envoyez-le à Claude.

---

## Pour information : ce que la configuration de production ajoute

Fichier `docker-compose.prod.yml`, activé par la ligne `COMPOSE_FILE` du
`.env` du serveur :

- **HTTPS automatique** (Caddy, `deploy/Caddyfile`), redirection de
  `http://` et de `www.` vers `https://votre-domaine` ; aucun journal des
  visites n'est conservé ;
- **base de données et site invisibles depuis Internet** : seul Caddy
  (ports 80/443) est exposé ;
- **mot de passe de base de données privé** (`POSTGRES_PASSWORD`) ;
- **adresse IP réelle des visiteurs** pour les limites anti-abus
  (`TRUSTED_PROXY_HOPS=1`) ;
- **contrôle de santé** du site (`/api/health`) ;
- **sauvegardes** chiffrées quotidiennes et service de **restauration**
  (`deploy/backup`).
