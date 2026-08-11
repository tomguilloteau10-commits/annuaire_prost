import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import {
  uploadProviderPhoto,
  PhotoLimitReachedError,
  MediaTooLargeError,
} from "@/modules/media/media.service";
import { ALLOWED_MEDIA_CONTENT_TYPES } from "@/modules/media";
import { checkCsrf } from "@/lib/route-helpers";

// multipart/form-data (pas de JSON) : le champ "file" porte l'image.
export async function POST(request: Request) {
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

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (!(ALLOWED_MEDIA_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "unsupported_content_type" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { mediaId } = await uploadProviderPhoto(profile.id, { buffer, contentType: file.type });
    // Entre en modération (status PENDING) — jamais visible publiquement
    // avant approbation (ENGINEERING_RULES.md §6-§7).
    return NextResponse.json({ mediaId, status: "PENDING" }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoLimitReachedError) {
      return NextResponse.json({ error: "photo_limit_reached" }, { status: 409 });
    }
    if (error instanceof MediaTooLargeError) {
      return NextResponse.json({ error: "file_too_large" }, { status: 413 });
    }
    throw error;
  }
}
