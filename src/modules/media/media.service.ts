import { prisma } from "@/lib/prisma";
import { getMediaStorage } from "./index";
import { canUploadMorePhotos, getProviderEntitlements } from "@/modules/entitlements/entitlements.service";
import { MAX_MEDIA_UPLOAD_BYTES, type UploadMediaInput } from "./types";

export class PhotoLimitReachedError extends Error {
  constructor() {
    super("Limite de photos du plan atteinte");
    this.name = "PhotoLimitReachedError";
  }
}

export class MediaTooLargeError extends Error {
  constructor() {
    super(`Fichier trop volumineux (max ${MAX_MEDIA_UPLOAD_BYTES} octets)`);
    this.name = "MediaTooLargeError";
  }
}

/**
 * Upload une photo pour un profil. Tout média entre en modération
 * (status PENDING) — il n'existe aucun chemin de code qui crée un média
 * APPROVED directement (ENGINEERING_RULES.md §7) : seule
 * modules/moderation peut faire cette transition.
 */
export async function uploadProviderPhoto(
  profileId: string,
  input: UploadMediaInput,
): Promise<{ mediaId: string }> {
  if (input.buffer.byteLength > MAX_MEDIA_UPLOAD_BYTES) {
    throw new MediaTooLargeError();
  }

  const [entitlements, currentPhotoCount] = await Promise.all([
    getProviderEntitlements(profileId),
    prisma.media.count({ where: { profileId } }),
  ]);
  if (!canUploadMorePhotos(currentPhotoCount, entitlements)) {
    throw new PhotoLimitReachedError();
  }

  const storage = getMediaStorage();
  const { storageKey } = await storage.upload(input);

  const media = await prisma.media.create({
    data: { profileId, storageKey, status: "PENDING", position: currentPhotoCount },
  });

  return { mediaId: media.id };
}

/**
 * Seul point d'accès à une URL de média. Renvoie `null` si le média n'est
 * pas approuvé — jamais d'URL, même signée et à courte durée de vie, pour
 * un média non modéré (ENGINEERING_RULES.md §6).
 */
export async function getPublicPhotoUrl(mediaId: string): Promise<string | null> {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media || media.status !== "APPROVED") return null;

  const storage = getMediaStorage();
  return storage.getSignedUrl(media.storageKey);
}

export async function deleteProviderPhoto(mediaId: string): Promise<void> {
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });
  const storage = getMediaStorage();
  await storage.delete(media.storageKey);
  await prisma.media.delete({ where: { id: mediaId } });
}
