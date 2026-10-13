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
}

export interface UpsertContactInput {
  phone?: string;
  email?: string;
  whatsapp?: string;
  instagram?: string;
}

export interface ListPublishedProfilesFilters {
  citySlug?: string;
  categoryKey?: string;
  languageCode?: string;
  onlineOnly?: boolean;
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
