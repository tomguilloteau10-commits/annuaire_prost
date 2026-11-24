import { describe, expect, it } from "vitest";
import { registerSchema } from "@/modules/auth/register-schema";

const base = { email: "test@example.test", password: "UnMotDePasseSolide-2026" };

describe("inscription : consentements obligatoires", () => {
  it("accepte une inscription avec les deux cases cochées", () => {
    expect(registerSchema.safeParse({ ...base, acceptTerms: true, consentSensitiveData: true }).success).toBe(
      true,
    );
  });

  it("refuse sans l'acceptation des conditions et de la politique de confidentialité", () => {
    expect(registerSchema.safeParse({ ...base, consentSensitiveData: true }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false, consentSensitiveData: true }).success).toBe(
      false,
    );
  });

  it("refuse sans le consentement exprès aux données sensibles", () => {
    expect(registerSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: true, consentSensitiveData: "true" }).success).toBe(
      false,
    );
  });
});
