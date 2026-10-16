import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { deleteProviderPhoto, setPrimaryPhoto } from "@/modules/media/media.service";
import { checkCsrf } from "@/lib/route-helpers";

/**
 * Photo de la prestataire connectée, ou une réponse d'erreur. 404 (pas 403)
 * si le média existe mais appartient à quelqu'un d'autre : on ne confirme
 * pas l'existence d'une ressource qui n'est pas la sienne.
 */
async function requireOwnPhoto(request: Request, mediaId: string) {
  const csrfError = checkCsrf(request);
  if (csrfError) return { error: csrfError };

  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    throw error;
  }

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { profile: { select: { userId: true } } },
  });
  if (!media || media.profile.userId !== user.id) {
    return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }
  return { media };
}

export async function DELETE(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const guard = await requireOwnPhoto(request, mediaId);
  if (guard.error) return guard.error;

  await deleteProviderPhoto(mediaId);
  return NextResponse.json({ ok: true });
}

/** Choisir la photo principale. */
export async function PATCH(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const guard = await requireOwnPhoto(request, mediaId);
  if (guard.error) return guard.error;

  await setPrimaryPhoto(guard.media.profileId, mediaId);
  return NextResponse.json({ ok: true });
}
