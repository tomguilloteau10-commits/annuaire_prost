import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { verifyMediaToken, readLocalMediaFile } from "@/modules/media/local-storage";

// Sert les fichiers pour le driver de stockage local uniquement — un
// backend S3 pointerait directement vers une URL présignée S3, sans
// repasser par cette route (voir modules/media/types.ts). Double
// vérification volontaire (défense en profondeur, ENGINEERING_RULES.md
// §6) : la signature/expiration du jeton d'abord, PUIS le statut de
// modération en base — un jeton valide mais pointant vers un média
// entre-temps rejeté ne sert jamais le fichier.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { MEDIA_STORAGE_DRIVER } = getEnv();
  if (MEDIA_STORAGE_DRIVER !== "local") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!key || !exp || !sig || !verifyMediaToken({ key, exp: Number(exp), sig })) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 403 });
  }

  const media = await prisma.media.findUnique({ where: { storageKey: key } });
  if (!media || media.status !== "APPROVED") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const file = await readLocalMediaFile(key);
  if (!file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
