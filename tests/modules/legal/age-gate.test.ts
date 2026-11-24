import { describe, expect, it } from "vitest";
import { hasConfirmedAge, isAgeGateExempt, localeFromPathname } from "@/lib/age-gate";

describe("contrôle 18+ à l'entrée", () => {
  it("s'applique à toutes les pages de l'annuaire", () => {
    for (const path of [
      "/fr",
      "/fr/",
      "/en/profiles/lina",
      "/de/categories/escort",
      "/fr/dashboard",
      "/it/admin",
    ]) {
      expect(isAgeGateExempt(path), path).toBe(false);
    }
  });

  it("laisse lisibles les pages légales et la page de confirmation", () => {
    for (const path of ["/fr/legal/terms", "/en/legal/privacy", "/de/legal/imprint", "/fr/age", "/legal/terms"]) {
      expect(isAgeGateExempt(path), path).toBe(true);
    }
  });

  it("ne se laisse pas contourner par une adresse qui ressemble à une page légale", () => {
    for (const path of ["/fr/legalese", "/fr/profiles/legal", "/fr/agenda", "/fr/categories/age"]) {
      expect(isAgeGateExempt(path), path).toBe(false);
    }
  });

  it("garde la langue de l'adresse demandée", () => {
    expect(localeFromPathname("/de/categories/escort")).toBe("de");
    expect(localeFromPathname("/xx/whatever")).toBe("fr");
    expect(localeFromPathname("/")).toBe("fr");
  });

  it("n'accepte que la valeur posée par le bouton de confirmation", () => {
    expect(hasConfirmedAge("1")).toBe(true);
    expect(hasConfirmedAge(undefined)).toBe(false);
    expect(hasConfirmedAge("0")).toBe(false);
    expect(hasConfirmedAge("true")).toBe(false);
  });
});
