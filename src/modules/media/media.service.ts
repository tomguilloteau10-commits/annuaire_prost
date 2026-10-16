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

  const [entitlements, currentPhotoCount, lastPosition] = await Promise.all([
    getProviderEntitlements(profileId),
    prisma.media.count({ where: { profileId } }),
    prisma.media.aggregate({ where: { profileId }, _max: { position: true } }),
  ]);
  if (!canUploadMorePhotos(currentPhotoCount, entitlements)) {
    throw new PhotoLimitReachedError();
  }

  const storage = getMediaStorage();
  const { storageKey } = await storage.upload(input);

  const media = await prisma.media.create({
    // Toujours après la dernière photo (le nombre de photos ne suffit pas :
    // après une suppression, deux photos auraient la même position).
    data: { profileId, storageKey, status: "PENDING", position: (lastPosition._max.position ?? -1) + 1 },
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

/**
 * Fait d'une photo la photo principale (première de la galerie et vignette
 * de l'annuaire) en renumérotant les positions. Ne change jamais le statut
 * de modération : une photo encore en attente ne devient visible qu'une
 * fois validée ; d'ici là, c'est la première photo validée qui s'affiche.
 */
export async function setPrimaryPhoto(profileId: string, mediaId: string): Promise<void> {
  const photos = await prisma.media.findMany({
    where: { profileId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const ordered = [mediaId, ...photos.map((p) => p.id).filter((id) => id !== mediaId)];
  await prisma.$transaction(
    ordered.map((id, position) => prisma.media.update({ where: { id }, data: { position } })),
  );
}
