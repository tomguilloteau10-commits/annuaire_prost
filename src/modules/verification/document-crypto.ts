import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Chiffrement des pièces déposées pour le contrôle manuel (ENGINEERING_RULES.md
 * §1). AES-256-GCM : le contenu stocké est `iv (12) | tag (16) | chiffré`,
 * jamais l'image en clair. Toute altération est détectée au déchiffrement.
 */
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function decodeKey(value: string): Buffer | null {
  const hex = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : null;
  const key = hex ?? Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
}

let cachedKey: Buffer | undefined;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const { DOCUMENT_ENCRYPTION_KEY, SESSION_SECRET } = getEnv();
  if (DOCUMENT_ENCRYPTION_KEY) {
    const key = decodeKey(DOCUMENT_ENCRYPTION_KEY);
    if (!key) throw new Error("DOCUMENT_ENCRYPTION_KEY doit faire 32 octets (base64 ou hex).");
    cachedKey = key;
  } else {
    // Clé dédiée dérivée (HKDF) : jamais SESSION_SECRET utilisé tel quel.
    cachedKey = Buffer.from(hkdfSync("sha256", SESSION_SECRET, "", "annuaire-prost/verification-documents", 32));
  }
  return cachedKey;
}

export function encryptDocument(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptDocument(stored: Buffer): Buffer {
  const iv = stored.subarray(0, IV_LENGTH);
  const tag = stored.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(stored.subarray(IV_LENGTH + TAG_LENGTH)), decipher.final()]);
}
