import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { readLocalMediaFile } from "@/modules/media/local-storage";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";

// Permet à une annonceuse de prévisualiser SES PROPRES photos quel que
// soit leur statut de modération (PENDING/REJECTED inclus) — distinct de
// /api/media/serve (public, APPROVED uniquement) et de la route de preview
// admin (n'importe quel média). Authentifié par session, jamais par URL
// partageable.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const { MEDIA_STORAGE_DRIVER } = getEnv();
  if (MEDIA_STORAGE_DRIVER !== "local") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { mediaId } = await params;
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { profile: { select: { userId: true } } },
  });
  if (!media || media.profile.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const file = await readLocalMediaFile(media.storageKey);
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store" },
  });
}
