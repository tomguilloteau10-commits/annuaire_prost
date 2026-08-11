import { getEnv } from "@/lib/env";
import { LocalMediaStorage } from "./local-storage";
import type { MediaStorage } from "./types";

/**
 * Point de branchement unique pour substituer un backend S3/objet
 * compatible : ajoutez un `case` ici et une implémentation dans ce dossier
 * respectant `MediaStorage`. Aucun appelant ne doit importer
 * `LocalMediaStorage` directement.
 */
export function getMediaStorage(): MediaStorage {
  const { MEDIA_STORAGE_DRIVER } = getEnv();
  switch (MEDIA_STORAGE_DRIVER) {
    case "local":
      return new LocalMediaStorage();
    default:
      throw new Error(`MediaStorage driver inconnu: ${MEDIA_STORAGE_DRIVER satisfies never}`);
  }
}

export type { MediaStorage, UploadMediaInput, UploadMediaOutput, GetSignedUrlOptions } from "./types";
export { ALLOWED_MEDIA_CONTENT_TYPES, MAX_MEDIA_UPLOAD_BYTES } from "./types";
