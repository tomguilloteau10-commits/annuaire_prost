export interface UploadMediaInput {
  buffer: Buffer;
  /** Doit faire partie de ALLOWED_MEDIA_CONTENT_TYPES — validé par l'implémentation. */
  contentType: string;
}

export interface UploadMediaOutput {
  /** Clé interne opaque, jamais une URL publique directe (ENGINEERING_RULES.md §6). */
  storageKey: string;
}

export interface GetSignedUrlOptions {
  ttlSeconds?: number;
}

/**
 * Abstraction de stockage média. L'implémentation bêta écrit sur disque
 * local (voir local-storage.ts) ; un backend S3/objet compatible se
 * substitue en implémentant la même interface (voir docs/ARCHITECTURE.md).
 *
 * Le contrat ne dit rien sur la modération : `getSignedUrl` fait confiance
 * à l'appelant pour ne jamais être invoqué sur un média non approuvé — ce
 * garde-fou vit dans modules/media/media.service.ts (la seule couche qui a
 * connaissance du statut de modération), pas ici. La raison : un backend
 * S3 générerait une URL présignée nativement consommée directement par
 * S3, sans repasser par notre backend à chaque requête — la vérification
 * de modération doit donc se faire *avant* la génération de l'URL, pas
 * seulement à chaque fetch.
 */
export interface MediaStorage {
  readonly driver: string;
  upload(input: UploadMediaInput): Promise<UploadMediaOutput>;
  getSignedUrl(storageKey: string, options?: GetSignedUrlOptions): Promise<string>;
  delete(storageKey: string): Promise<void>;
}

export const ALLOWED_MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMediaContentType = (typeof ALLOWED_MEDIA_CONTENT_TYPES)[number];

export const MAX_MEDIA_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 Mo
