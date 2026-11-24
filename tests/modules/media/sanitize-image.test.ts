import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeImage, InvalidImageError, MAX_IMAGE_DIMENSION } from "@/modules/media/sanitize-image";

// Photo de test « prise au téléphone » : position GPS, appareil, orientation.
async function phonePhoto(width: number, height: number, format: "jpeg" | "png" | "webp" = "jpeg") {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 120, g: 60, b: 90 } } })
    .withMetadata({ orientation: 6 })
    .withExif({
      IFD0: { Make: "TestPhone", Model: "Model X" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "46/1 12/1 0/1",
        GPSLongitudeRef: "E",
        GPSLongitude: "6/1 8/1 0/1",
      },
    });
  return base.toFormat(format).toBuffer();
}

describe("sanitizeImage", () => {
  it("retire toutes les métadonnées (GPS, appareil) d'une photo JPEG", async () => {
    const input = await phonePhoto(400, 300);
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);
    expect(input.includes(Buffer.from("TestPhone"))).toBe(true);

    const { buffer, contentType } = await sanitizeImage(input, "image/jpeg");
    const after = await sharp(buffer).metadata();
    expect(contentType).toBe("image/jpeg");
    expect(after.format).toBe("jpeg");
    expect(after.exif).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(after.iptc).toBeUndefined();
    expect(buffer.includes(Buffer.from("TestPhone"))).toBe(false);
  });

  it("redresse la photo selon son orientation avant de la retirer", async () => {
    const { buffer } = await sanitizeImage(await phonePhoto(400, 300), "image/jpeg");
    const after = await sharp(buffer).metadata();
    // Orientation 6 = rotation de 90° : la photo devient verticale.
    expect([after.width, after.height]).toEqual([300, 400]);
    expect(after.orientation).toBeUndefined();
  });

  it("réduit les très grandes photos sans les agrandir", async () => {
    const big = await sanitizeImage(
      await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#333" } })
        .jpeg()
        .toBuffer(),
      "image/jpeg",
    );
    const bigMeta = await sharp(big.buffer).metadata();
    expect(Math.max(bigMeta.width!, bigMeta.height!)).toBe(MAX_IMAGE_DIMENSION);

    const small = await sanitizeImage(await phonePhoto(200, 100, "png"), "image/png");
    const smallMeta = await sharp(small.buffer).metadata();
    expect(smallMeta.format).toBe("png");
    expect(smallMeta.exif).toBeUndefined();
    expect(Math.max(smallMeta.width!, smallMeta.height!)).toBe(200);
  });

  it("conserve le format WebP", async () => {
    const { buffer } = await sanitizeImage(await phonePhoto(300, 300, "webp"), "image/webp");
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("refuse un fichier qui n'est pas une image décodable", async () => {
    const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("pas une image")]);
    await expect(sanitizeImage(fake, "image/jpeg")).rejects.toBeInstanceOf(InvalidImageError);
  });
});
