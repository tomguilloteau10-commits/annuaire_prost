import { NextResponse } from "next/server";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getPublishedProfileBySlug(slug);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const photoUrls = await Promise.all(profile.media.map((media) => getPublicPhotoUrl(media.id)));

  return NextResponse.json({
    ...profile,
    photoUrls: photoUrls.filter((url): url is string => url !== null),
    media: undefined,
  });
}
