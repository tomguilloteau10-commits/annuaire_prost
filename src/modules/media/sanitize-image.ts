import sharp from "sharp";
import type { AllowedMediaContentType } from "./types";

/** Plus grand côté conservé : largement assez pour un affichage plein écran. */
export const MAX_IMAGE_DIMENSION = 2000;
/** Garde-fou contre les « bombes » d'image (petit fichier, dimensions énormes). */
const MAX_INPUT_PIXELS = 60_000_000;

export class InvalidImageError extends Error {
  constructor() {
    super("Image illisible ou corrompue");
    this.name = "InvalidImageError";
  }
}

/**
 * Ré-encode chaque photo déposée avant tout stockage :
 *
 * - SUPPRIME TOUTES LES MÉTADONNÉES (EXIF, GPS, modèle et numéro de série
 *   de l'appareil, date, logiciel, XMP, IPTC). Une photo prise au
 *   téléphone contient souvent la position exacte où elle a été prise —
 *   potentiellement le domicile de la prestataire. Aucune n'en sort ;
 * - redresse l'image selon son orientation (sinon une photo prise en
 *   portrait s'afficherait couchée une fois l'orientation EXIF retirée) ;
 * - limite le plus grand côté à MAX_IMAGE_DIMENSION px (pages plus
 *   légères, sans perte visible) ;
 * - refuse un fichier qui n'est pas une image décodable.
 *
 * Le format d'origine est conservé (JPEG, PNG ou WebP).
 */
export async function sanitizeImage(
  buffer: Buffer,
  contentType: AllowedMediaContentType,
): Promise<{ buffer: Buffer; contentType: AllowedMediaContentType }> {
  try {
    // sharp ne recopie aucune métadonnée en sortie tant que
    // withMetadata()/keepExif() n'est pas appelé : ne jamais l'ajouter ici.
    const pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });

    const output =
      contentType === "image/png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : contentType === "image/webp"
          ? await pipeline.webp({ quality: 85 }).toBuffer()
          : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

    return { buffer: output, contentType };
  } catch {
    throw new InvalidImageError();
  }
}
