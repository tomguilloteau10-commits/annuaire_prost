import { deflateSync, crc32 } from "node:zlib";

/**
 * Génère un PNG synthétique uni (aucune dépendance externe, aucune photo
 * réelle) — utilisé par le seed synthétique pour peupler des profils
 * fictifs sans jamais référencer une image de personne réelle. Voir
 * ENGINEERING_RULES.md "Données de test synthétiques uniquement".
 */

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcValue = crc32(Buffer.concat([typeBuf, data])) >>> 0;
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcValue, 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

export function createPlaceholderPng(rgb: [number, number, number], size = 512): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB (pas de canal alpha, pas de palette)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const [r, g, b] = rgb;
  const rowLength = size * 3;
  const raw = Buffer.alloc((rowLength + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLength + 1);
    raw[rowStart] = 0; // filtre "none"
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
