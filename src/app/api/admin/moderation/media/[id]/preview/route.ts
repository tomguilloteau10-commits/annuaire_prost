import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { readLocalMediaFile } from "@/modules/media/local-storage";
import { requireRole } from "@/lib/route-helpers";

// Distinct de /api/media/serve à dessein : cette route sert un média quel
// que soit son statut de modération, mais uniquement à un modérateur/admin
// authentifié par session — jamais par une URL partageable/signée. C'est
// le seul chemin de code qui peut afficher un média PENDING/REJECTED, et
// il ne contourne pas la protection publique (ENGINEERING_RULES.md §6),
// il vit à côté d'elle pour un usage strictement interne.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(["MODERATOR", "ADMIN"]);
  if (guard.error) return guard.error;

  const { MEDIA_STORAGE_DRIVER } = getEnv();
  if (MEDIA_STORAGE_DRIVER !== "local") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const file = await readLocalMediaFile(media.storageKey);
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store" },
  });
}
