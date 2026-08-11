import { describe, expect, it } from "vitest";
import { MockVerificationProvider } from "@/modules/verification/mock-provider";

// Vérifie le "contrat de résultat" (ENGINEERING_RULES.md §1) au niveau
// runtime, pas seulement au niveau du type TypeScript : même une
// implémentation qui contournerait le typage (any, cast...) ne doit jamais
// faire apparaître un champ interdit dans l'objet réellement renvoyé.
const FORBIDDEN_KEYS = [
  "dateOfBirth",
  "birthDate",
  "dob",
  "documentNumber",
  "documentImage",
  "idDocumentImage",
  "selfieImage",
  "biometricData",
];

describe("MockVerificationProvider", () => {
  it("simule un parcours complet sans jamais exposer de champ interdit", async () => {
    const provider = new MockVerificationProvider();
    const started = await provider.startVerification({ providerId: "user_test" });

    expect(started.externalVerificationId).toMatch(/^mock_/);
    expect(started.redirectUrl).toBeNull();

    const result = await provider.getResult(started.externalVerificationId);

    expect(result.status).toBe("VERIFIED");
    expect(result.isAdult).toBe(true);
    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);

    for (const forbiddenKey of FORBIDDEN_KEYS) {
      expect(Object.keys(result)).not.toContain(forbiddenKey);
    }
  });

  it("rejette la lecture d'un identifiant de vérification inconnu", async () => {
    const provider = new MockVerificationProvider();
    await expect(provider.getResult("mock_does-not-exist")).rejects.toThrow();
  });
});
