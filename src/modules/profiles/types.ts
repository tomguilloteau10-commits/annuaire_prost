import type { OnlineStatus } from "@prisma/client";

export interface UpsertProfileInput {
  displayName: string;
  age: number;
  description: string;
  citySlug: string;
  categoryKey: string;
  languageCodes: string[];
  serviceKeys: string[];
  onlineStatus?: OnlineStatus;
  details?: ProfileDetailsInput;
}

/**
 * Infos complémentaires, toutes facultatives (null = non renseigné). Les
 * valeurs sont validées par l'API contre modules/profiles/attributes.ts.
 */
export interface ProfileDetailsInput {
  heightCm: number | null;
  bodyType: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  rate30Min: number | null;
  rate1Hour: number | null;
  rate2Hours: number | null;
  rateNight: number | null;
  availableDays: string[];
  availableFrom: string | null;
  availableTo: string | null;
  receives: boolean;
  travels: boolean;
  travelRadiusKm: number | null;
  tattoos: boolean | null;
  piercings: boolean | null;
  origin: string | null;
  clientele: string[];
  paymentMethods: string[];
  salonSlug: string | null;
  cupSize: string | null;
  pubicHair: string | null;
  rateFrom: number | null;
  contactMethods: string[];
}

/** null efface le champ (la prestataire a vidé la case). */
export interface UpsertContactInput {
  phone?: string | null;
  email?: string | null;
  whatsapp?: string;
  instagram?: string | null;
}

/** Bornes d'un curseur (incluses) ; une borne absente n'est pas appliquée. */
export interface NumberRange {
  min?: number;
  max?: number;
}

/**
 * Critères de recherche de l'annuaire. Dans une même liste, un profil est
 * retenu s'il correspond à L'UNE des valeurs (ex. cheveux blonds OU bruns),
 * sauf `serviceKeys` : il doit proposer TOUS les services cochés.
 */
export interface ListPublishedProfilesFilters {
  /** Code canton (GE, VD…) : tous les profils du canton si aucune ville n'est choisie. */
  canton?: string;
  citySlug?: string;
  categoryKey?: string;
  languageCode?: string;
  onlineOnly?: boolean;
  age?: NumberRange;
  /** Le haut de l'échelle (199) signifie « 1,99 m et plus ». */
  heightCm?: NumberRange;
  /** Sur le tarif de référence (« à partir de », sinon 1 heure). */
  price?: NumberRange;
  /** Indices dans CUP_SIZES (0 = A … 7 = H+). */
  cup?: NumberRange;
  bodyTypes?: string[];
  hairColors?: string[];
  eyeColors?: string[];
  origins?: string[];
  pubicHair?: string[];
  tattoos?: boolean;
  meetings?: string[];
  paymentMethods?: string[];
  contactMethods?: string[];
  clientele?: string[];
  serviceKeys?: string[];
}

export class UnknownTaxonomyReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownTaxonomyReferenceError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Profil introuvable");
    this.name = "ProfileNotFoundError";
  }
}

export class OnboardingIncompleteError extends Error {
  constructor() {
    super("L'attestation d'onboarding doit être complétée avant de soumettre le profil");
    this.name = "OnboardingIncompleteError";
  }
}

export class VerificationIncompleteError extends Error {
  constructor() {
    super("La vérification 18+ doit être validée avant de soumettre le profil");
    this.name = "VerificationIncompleteError";
  }
}

export class ProfileIncompleteError extends Error {
  constructor(public readonly missing: "photo" | "whatsapp") {
    super(
      missing === "photo"
        ? "Au moins une photo est nécessaire avant de soumettre le profil"
        : "Un numéro WhatsApp est nécessaire avant de soumettre le profil",
    );
    this.name = "ProfileIncompleteError";
  }
}

/** Plus petite et plus grande valeur renseignées (curseurs de l'annuaire). */
export interface FacetRange {
  min: number;
  max: number;
}

/**
 * Valeurs renseignées par au moins un profil publié : l'annuaire n'affiche
 * un filtre (et ses options) que si des profils peuvent y correspondre.
 */
export interface PublishedProfileFacets {
  age: FacetRange | null;
  heightCm: FacetRange | null;
  price: FacetRange | null;
  /** Indices dans CUP_SIZES. */
  cup: FacetRange | null;
  bodyTypes: string[];
  hairColors: string[];
  eyeColors: string[];
  origins: string[];
  pubicHair: string[];
  tattoos: boolean[];
  meetings: ("receives" | "travels")[];
  paymentMethods: string[];
  contactMethods: string[];
  clientele: string[];
  services: { key: string; label: unknown }[];
}
