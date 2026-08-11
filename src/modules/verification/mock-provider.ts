import { randomUUID } from "node:crypto";
import type {
  StartVerificationInput,
  StartVerificationOutput,
  VerificationProvider,
  VerificationResult,
} from "./types";

const VERIFICATION_VALIDITY_MS = 1000 * 60 * 60 * 24 * 365; // 1 an

// Persiste les résultats simulés en mémoire process, à la manière du
// singleton Prisma (voir src/lib/prisma.ts) pour survivre au hot-reload de
// Next.js en dev. Un vrai provider externe n'aurait pas besoin de ça : le
// résultat vivrait chez lui, interrogé via getResult().
const globalForMockVerification = globalThis as unknown as {
  mockVerificationResults: Map<string, VerificationResult> | undefined;
};

const results =
  globalForMockVerification.mockVerificationResults ?? new Map<string, VerificationResult>();
globalForMockVerification.mockVerificationResults = results;

/**
 * Implémentation bêta de VerificationProvider. Simule le parcours complet
 * (upload factice de document → décision de majorité) SANS jamais recevoir
 * ni persister la moindre image, numéro de document ou date de naissance —
 * ces données n'existent nulle part dans ce fichier, y compris en entrée :
 * `startVerification` ne prend qu'un `providerId` en argument.
 *
 * Le résultat est toujours positif (isAdult: true) : cette implémentation
 * sert à exercer le flux de bout en bout en bêta, pas à tester des cas de
 * rejet — un vrai provider (Sumsub, Veriff, PXL Vision, e-ID suisse) sera
 * substitué avant toute ouverture publique.
 */
export class MockVerificationProvider implements VerificationProvider {
  readonly name = "mock";

  async startVerification(_input: StartVerificationInput): Promise<StartVerificationOutput> {
    const externalVerificationId = `mock_${randomUUID()}`;
    const now = new Date();

    results.set(externalVerificationId, {
      externalVerificationId,
      status: "VERIFIED",
      isAdult: true,
      documentType: "passport",
      issuingCountry: "CH",
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + VERIFICATION_VALIDITY_MS),
    });

    // Pas de redirection : le "parcours" mock se termine dans le même
    // aller-retour, contrairement à un provider réel qui hébergerait le
    // flux d'upload chez lui.
    return { externalVerificationId, redirectUrl: null };
  }

  async getResult(externalVerificationId: string): Promise<VerificationResult> {
    const result = results.get(externalVerificationId);
    if (!result) {
      throw new Error(`Aucun résultat de vérification simulé pour ${externalVerificationId}`);
    }
    return result;
  }
}
