import { getPublicPhotoUrl } from "@/modules/media/media.service";

/**
 * Ajoute à chaque profil public l'URL signée de sa première photo
 * approuvée (ou null). Passe exclusivement par getPublicPhotoUrl, seul
 * chemin autorisé vers un média (ENGINEERING_RULES.md §6).
 */
export async function withThumbnails<T extends { media: { id: string }[] }>(
  profiles: T[],
): Promise<(T & { thumbnailUrl: string | null })[]> {
  return Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      thumbnailUrl: profile.media[0] ? await getPublicPhotoUrl(profile.media[0].id) : null,
    })),
  );
}
