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
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasImageSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
  if (contentType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

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
  // Le type annoncé par le navigateur ne suffit pas : on vérifie que le
  // contenu est bien une image du format annoncé (fichier renommé, photo
  // abîmée…), sinon refus avec le même message clair.
  if (!hasImageSignature(buffer, file.type)) {
    return NextResponse.json({ error: "unsupported_content_type" }, { status: 415 });
  }

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
