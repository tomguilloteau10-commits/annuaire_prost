import "server-only";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/env";
import {
  ALLOWED_MEDIA_CONTENT_TYPES,
  type AllowedMediaContentType,
  type GetSignedUrlOptions,
  type MediaStorage,
  type UploadMediaInput,
  type UploadMediaOutput,
} from "./types";

const EXTENSION_BY_CONTENT_TYPE: Record<AllowedMediaContentType, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const CONTENT_TYPE_BY_EXTENSION: Record<string, AllowedMediaContentType> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function isAllowedContentType(value: string): value is AllowedMediaContentType {
  return (ALLOWED_MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

function sign(storageKey: string, expiresAt: number): string {
  const { MEDIA_SIGNING_SECRET } = getEnv();
  return createHmac("sha256", MEDIA_SIGNING_SECRET)
    .update(`${storageKey}:${expiresAt}`)
    .digest("hex");
}

export interface MediaTokenParts {
  key: string;
  exp: number;
  sig: string;
}

/**
 * Vérifie la signature et l'expiration d'un jeton de média local. Exportée
 * séparément de la classe pour que la route /api/media/serve (qui ne
 * connaît que des paramètres de requête bruts) puisse vérifier sans
 * instancier tout le storage.
 */
export function verifyMediaToken({ key, exp, sig }: MediaTokenParts): boolean {
  if (Date.now() > exp) return false;
  const expected = sign(key, exp);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(expectedBuf, sigBuf);
}

export async function readLocalMediaFile(
  storageKey: string,
): Promise<{ buffer: Buffer; contentType: AllowedMediaContentType } | null> {
  const { MEDIA_LOCAL_PATH } = getEnv();
  const extension = path.extname(storageKey);
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (!contentType) return null;

  try {
    const buffer = await readFile(resolveStoragePath(MEDIA_LOCAL_PATH, storageKey));
    return { buffer, contentType };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// Empêche toute tentative de traversée de chemin (`../..`) via une
// storageKey forgée : on ne retient que le nom de fichier, jamais un
// chemin fourni tel quel.
function resolveStoragePath(basePath: string, storageKey: string): string {
  const safeName = path.basename(storageKey);
  return path.join(basePath, safeName);
}

export class LocalMediaStorage implements MediaStorage {
  readonly driver = "local";

  async upload({ buffer, contentType }: UploadMediaInput): Promise<UploadMediaOutput> {
    if (!isAllowedContentType(contentType)) {
      throw new Error(`Type de média non autorisé: ${contentType}`);
    }
    const { MEDIA_LOCAL_PATH } = getEnv();
    await mkdir(MEDIA_LOCAL_PATH, { recursive: true });

    const storageKey = `${randomBytes(16).toString("hex")}${EXTENSION_BY_CONTENT_TYPE[contentType]}`;
    await writeFile(resolveStoragePath(MEDIA_LOCAL_PATH, storageKey), buffer);
    return { storageKey };
  }

  async getSignedUrl(storageKey: string, options?: GetSignedUrlOptions): Promise<string> {
    const { MEDIA_SIGNED_URL_TTL_SECONDS } = getEnv();
    const ttlSeconds = options?.ttlSeconds ?? MEDIA_SIGNED_URL_TTL_SECONDS;
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const signature = sign(storageKey, expiresAt);

    const params = new URLSearchParams({
      key: storageKey,
      exp: String(expiresAt),
      sig: signature,
    });
    // URL relative same-origin : servie par /api/media/serve (voir cette
    // route pour la seconde vérification, au niveau du statut de
    // modération en base — défense en profondeur, ENGINEERING_RULES.md §6).
    return `/api/media/serve?${params.toString()}`;
  }

  async delete(storageKey: string): Promise<void> {
    const { MEDIA_LOCAL_PATH } = getEnv();
    try {
      await unlink(resolveStoragePath(MEDIA_LOCAL_PATH, storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
