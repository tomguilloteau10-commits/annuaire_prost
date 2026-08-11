import type { VerificationStatus } from "@prisma/client";

/**
 * Contrat de résultat normalisé — ENGINEERING_RULES.md §1 (rétention zéro).
 *
 * Ce type est la SEULE forme sous laquelle une information de vérification
 * peut circuler dans l'application. Il n'a, par construction, aucun champ
 * pour transporter une image de document, un numéro de document, une
 * date de naissance ou une donnée biométrique — un futur provider réel
 * (Sumsub, Veriff, PXL Vision, e-ID suisse) doit produire CE type en
 * sortie, quoi qu'il reçoive ou traite en interne de son côté. Le document
 * brut ne doit jamais transiter par notre backend ; s'il le faut
 * techniquement (upload direct vers le provider depuis le navigateur), il
 * ne doit jamais être passé en argument d'aucune fonction de ce module.
 */
export interface VerificationResult {
  externalVerificationId: string;
  status: VerificationStatus;
  /** null tant que le résultat n'est pas disponible (status PENDING/IN_PROGRESS). */
  isAdult: boolean | null;
  /** Type de document seulement (ex: "passport", "id_card") — jamais le numéro. */
  documentType: string | null;
  /** Code ISO du pays émetteur. */
  issuingCountry: string | null;
  verifiedAt: Date | null;
  /** Validité métier du résultat (ex: revérifier après N mois). */
  expiresAt: Date | null;
}

export interface StartVerificationInput {
  /** userId de l'annonceuse qui démarre sa vérification. */
  providerId: string;
}

export interface StartVerificationOutput {
  externalVerificationId: string;
  /** URL vers laquelle rediriger l'utilisateur pour compléter le parcours chez le provider externe. null si non applicable (ex: mock). */
  redirectUrl: string | null;
}

/**
 * Interface que toute implémentation de vérification 18+ doit respecter,
 * simulée ou réelle. Volontairement minimale (deux méthodes, comme
 * spécifié) : `startVerification` initie le parcours côté provider,
 * `getResult` retourne l'état actuel du résultat normalisé.
 */
export interface VerificationProvider {
  readonly name: string;
  startVerification(input: StartVerificationInput): Promise<StartVerificationOutput>;
  getResult(externalVerificationId: string): Promise<VerificationResult>;
}
