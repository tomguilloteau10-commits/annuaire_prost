import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPhoneNumber, isValidWhatsapp } from "@/modules/profiles/contact-validation";

describe("saisie du contact", () => {
  it("accepte les numéros suisses et internationaux usuels", () => {
    for (const n of ["+41 79 123 45 67", "079 123 45 67", "+41791234567", "0041 (0)79 123 45 67", "+33 6 12 34 56 78"]) {
      expect(isValidPhoneNumber(n)).toBe(true);
    }
  });

  it("refuse les numéros incomplets ou avec des lettres", () => {
    for (const n of ["123", "+41 79", "abc 123 45 67", "079-123-45-67-89-01-23"]) {
      expect(isValidPhoneNumber(n)).toBe(false);
    }
  });

  it("WhatsApp : numéro ou lien wa.me", () => {
    expect(isValidWhatsapp("+41 78 200 00 01")).toBe(true);
    expect(isValidWhatsapp("https://wa.me/41782000001")).toBe(true);
    expect(isValidWhatsapp("wa.me/41")).toBe(false);
    expect(isValidWhatsapp("")).toBe(false);
  });

  it("e-mail", () => {
    expect(isValidEmail("nom@exemple.ch")).toBe(true);
    expect(isValidEmail("nom@exemple")).toBe(false);
    expect(isValidEmail("nom exemple.ch")).toBe(false);
  });
});
