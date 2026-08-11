import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { deleteProviderPhoto } from "@/modules/media/media.service";
import { checkCsrf } from "@/lib/route-helpers";

export async function DELETE(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const { mediaId } = await params;
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { profile: { select: { userId: true } } },
  });
  // 404 (pas 403) si le média existe mais appartient à quelqu'un d'autre :
  // on ne confirme pas l'existence d'une ressource qui n'est pas la sienne.
  if (!media || media.profile.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await deleteProviderPhoto(mediaId);
  return NextResponse.json({ ok: true });
}
