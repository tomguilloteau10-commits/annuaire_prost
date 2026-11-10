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

/** Valeur d'exemple de .env.example : reconnue pour relire les anciens dépôts, jamais pour chiffrer. */
export const EXAMPLE_SECRET = "change-me-in-a-real-random-value";

const deriveKey = (secret: string) =>
  Buffer.from(hkdfSync("sha256", secret, "", "annuaire-prost/verification-documents", 32));

let cachedKeys: Buffer[] | undefined;

/**
 * Clés utilisables : la première chiffre ; les suivantes servent seulement
 * à relire des pièces déposées avant un changement de clé (par exemple
 * quand les secrets d'exemple ont été remplacés au démarrage — voir
 * docker-entrypoint.sh). Ces pièces sont de toute façon supprimées à la
 * décision de l'admin ou au plus tard après 30 jours.
 */
function getKeys(): Buffer[] {
  if (cachedKeys) return cachedKeys;
  const { DOCUMENT_ENCRYPTION_KEY, SESSION_SECRET } = getEnv();
  const keys: Buffer[] = [];
  if (DOCUMENT_ENCRYPTION_KEY) {
    const key = decodeKey(DOCUMENT_ENCRYPTION_KEY);
    if (!key) throw new Error("DOCUMENT_ENCRYPTION_KEY doit faire 32 octets (base64 ou hex).");
    keys.push(key);
  }
  // Clé dédiée dérivée (HKDF) : jamais SESSION_SECRET utilisé tel quel.
  keys.push(deriveKey(SESSION_SECRET));
  if (SESSION_SECRET !== EXAMPLE_SECRET) keys.push(deriveKey(EXAMPLE_SECRET));
  cachedKeys = keys;
  return keys;
}

export function encryptDocument(plain: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKeys()[0]!, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decryptDocument(stored: Buffer): Buffer {
  const iv = stored.subarray(0, IV_LENGTH);
  const tag = stored.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const body = stored.subarray(IV_LENGTH + TAG_LENGTH);
  let lastError: unknown;
  // GCM authentifie le contenu : une mauvaise clé échoue, on essaie la suivante.
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(body), decipher.final()]);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
