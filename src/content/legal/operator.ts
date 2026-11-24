/**
 * Informations sur l'exploitant·e du site, reprises dans les pages légales.
 * Tant qu'une valeur vaut `null`, la page affiche « [À compléter : …] »
 * surligné, pour qu'aucun manque ne passe inaperçu.
 */
export const OPERATOR = {
  /** Raison sociale, ou nom et prénom si exploitation en nom propre. */
  name: null as string | null,
  /** Adresse postale complète en Suisse. */
  address: null as string | null,
  /** Adresse e-mail de contact (questions, données personnelles, signalements). */
  email: null as string | null,
  /** Numéro IDE (CHE-xxx.xxx.xxx), si l'activité est inscrite au registre du commerce. */
  uid: null as string | null,
  /** Personne responsable du contenu du site. */
  responsible: null as string | null,
  /** Hébergeur du site : nom, ville, pays. */
  host: null as string | null,
  /** Service d'envoi des e-mails (serveur SMTP) : nom et pays. */
  emailProvider: null as string | null,
  /** Prix de l'abonnement, ex. « 49 CHF » (pour 30 jours). */
  subscriptionPrice: null as string | null,
  /** Ville du for juridique, ex. « Lausanne ». */
  court: null as string | null,
};

/**
 * Tant que `true`, chaque page légale affiche un bandeau « projet de texte
 * à faire valider ». À passer à `false` une fois les textes validés par un·e
 * juriste et les champs ci-dessus remplis.
 */
export const LEGAL_DRAFT = true;

/** Date de la version en vigueur (affichée et enregistrée à chaque acceptation). */
export const LEGAL_VERSION = "2026-11-24";
