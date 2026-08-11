import { describe, expect, it } from "vitest";
import { LocalMediaStorage, verifyMediaToken } from "@/modules/media/local-storage";

function parseToken(url: string) {
  const params = new URL(url, "http://localhost").searchParams;
  return {
    key: params.get("key") ?? "",
    exp: Number(params.get("exp")),
    sig: params.get("sig") ?? "",
  };
}

// Ces tests couvrent uniquement la signature/expiration des URLs — pas
// l'écriture/lecture sur disque (couverte par les tests d'invariants avec
// une vraie base, à venir). ENGINEERING_RULES.md §6 : une URL signée doit
// être infalsifiable et expirer.
describe("LocalMediaStorage — URLs signées", () => {
  it("génère un jeton valide immédiatement après émission", async () => {
    const storage = new LocalMediaStorage();
    const url = await storage.getSignedUrl("abc123.jpg", { ttlSeconds: 60 });
    expect(verifyMediaToken(parseToken(url))).toBe(true);
  });

  it("rejette un jeton déjà expiré", async () => {
    const storage = new LocalMediaStorage();
    const url = await storage.getSignedUrl("abc123.jpg", { ttlSeconds: -1 });
    expect(verifyMediaToken(parseToken(url))).toBe(false);
  });

  it("rejette une signature falsifiée", async () => {
    const storage = new LocalMediaStorage();
    const url = await storage.getSignedUrl("abc123.jpg", { ttlSeconds: 60 });
    const token = parseToken(url);
    expect(verifyMediaToken({ ...token, sig: "0".repeat(64) })).toBe(false);
  });

  it("rejette un jeton dont la clé a été substituée (signature calculée pour une autre clé)", async () => {
    const storage = new LocalMediaStorage();
    const url = await storage.getSignedUrl("abc123.jpg", { ttlSeconds: 60 });
    const token = parseToken(url);
    expect(verifyMediaToken({ ...token, key: "other-file.jpg" })).toBe(false);
  });
});
