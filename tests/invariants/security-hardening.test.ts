import { afterEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import { checkRateLimits, isRateLimited, recordAttempt, resetRateLimit } from "@/lib/rate-limit";
import { extractClientIp } from "@/lib/ip-hash";
import { rejectOversizedUpload } from "@/lib/form-upload";
import { instagramHandle, isValidInstagram } from "@/modules/profiles/contact-validation";
import { redactSensitiveFields } from "@/lib/logger";

// Garde-fous ajoutés lors de l'audit de sécurité (voir ENGINEERING_RULES.md §5).

describe("limitation de débit", () => {
  it("un seau par compte bloque même si chaque tentative vient d'une « IP » différente", () => {
    const account = { key: `test:account:${Math.random()}`, limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited(account)).toBe(false);
      recordAttempt(account); // mot de passe faux, quelle que soit l'IP annoncée
    }
    expect(isRateLimited(account)).toBe(true);
    resetRateLimit(account.key); // connexion réussie
    expect(isRateLimited(account)).toBe(false);
  });

  it("plafond global : refusé quand le total est atteint, sans consommer les autres seaux", () => {
    const global = { key: `test:global:${Math.random()}`, limit: 2, windowMs: 60_000 };
    const ip = (n: number) => ({ key: `test:ip:${n}:${Math.random()}`, limit: 5, windowMs: 60_000 });
    expect(checkRateLimits([ip(1), global])).toBe(true);
    expect(checkRateLimits([ip(2), global])).toBe(true);
    const third = ip(3);
    expect(checkRateLimits([third, global])).toBe(false);
    expect(isRateLimited({ ...third, limit: 1 })).toBe(false); // la requête refusée n'a pas été comptée
  });
});

describe("IP du visiteur", () => {
  afterEach(() => vi.unstubAllEnvs());
  const request = (xff: string) => new Request("http://localhost/", { headers: { "x-forwarded-for": xff } });

  it("derrière un proxy de confiance, l'IP est lue là où le client ne peut pas écrire", () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    // Le client a envoyé "1.1.1.1" ; le proxy a ajouté l'adresse réelle à la fin.
    expect(extractClientIp(request("1.1.1.1, 203.0.113.9"))).toBe("203.0.113.9");
  });

  it("sans proxy déclaré, comportement inchangé (première valeur)", () => {
    expect(extractClientIp(request("203.0.113.9"))).toBe("203.0.113.9");
  });
});

describe("envois de fichiers", () => {
  const upload = (length?: string) =>
    new Request("http://localhost/", { method: "POST", headers: length ? { "content-length": length } : {} });

  it("refuse avant lecture un envoi plus lourd que la limite, ou sans taille annoncée", () => {
    expect(rejectOversizedUpload(upload(String(50 * 1024 * 1024)), 8 * 1024 * 1024)?.status).toBe(413);
    expect(rejectOversizedUpload(upload(), 8 * 1024 * 1024)?.status).toBe(411);
    expect(rejectOversizedUpload(upload(String(2 * 1024 * 1024)), 8 * 1024 * 1024)).toBeNull();
  });
});

describe("contact Instagram", () => {
  it("n'accepte qu'un pseudo ou un lien instagram.com, jamais un lien arbitraire", () => {
    expect(isValidInstagram("@lea.massage")).toBe(true);
    expect(instagramHandle("https://www.instagram.com/lea_ch/")).toBe("lea_ch");
    expect(isValidInstagram("https://site-piege.example/login")).toBe(false);
    expect(isValidInstagram("javascript:alert(1)")).toBe(false);
  });
});

describe("journaux", () => {
  it("les champs sensibles sont masqués, même imbriqués", () => {
    const safe = JSON.stringify(
      redactSensitiveFields({ userId: "u1", contact: { phone: "+41 79 000 00 00", email: "x@example.test" }, password: "secret" }),
    );
    expect(safe).not.toContain("+41 79");
    expect(safe).not.toContain("x@example.test");
    expect(safe).not.toContain("secret");
    expect(safe).toContain("u1");
  });
});

describe("chiffrement des pièces d'identité", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("après remplacement des secrets d'exemple, les pièces déjà déposées restent lisibles par l'admin", async () => {
    // Pièce chiffrée avec l'ancienne clé (dérivée du secret d'exemple public).
    const legacyKey = Buffer.from(
      hkdfSync("sha256", "change-me-in-a-real-random-value", "", "annuaire-prost/verification-documents", 32),
    );
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", legacyKey, iv);
    const body = Buffer.concat([cipher.update(Buffer.from("piece-synthetique")), cipher.final()]);
    const legacyStored = Buffer.concat([iv, cipher.getAuthTag(), body]);

    // Nouvelle configuration : clé dédiée aléatoire (générée au démarrage Docker).
    vi.stubEnv("DOCUMENT_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
    vi.stubEnv("SESSION_SECRET", randomBytes(32).toString("hex"));
    vi.resetModules();
    const crypto = await import("@/modules/verification/document-crypto");

    expect(crypto.decryptDocument(legacyStored).toString()).toBe("piece-synthetique");
    // Les nouveaux dépôts utilisent la nouvelle clé, illisible avec l'ancienne.
    const fresh = crypto.encryptDocument(Buffer.from("nouvelle"));
    const decipher = (await import("node:crypto")).createDecipheriv("aes-256-gcm", legacyKey, fresh.subarray(0, 12));
    decipher.setAuthTag(fresh.subarray(12, 28));
    expect(() => Buffer.concat([decipher.update(fresh.subarray(28)), decipher.final()])).toThrow();
    expect(crypto.decryptDocument(fresh).toString()).toBe("nouvelle");
  });
});
