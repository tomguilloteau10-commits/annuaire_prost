import { NextResponse } from "next/server";
import { listPublishedProfiles } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";

// Liste publique : uniquement des profils PUBLISHED (vérifiés + modérés),
// jamais de contact dans la réponse (ENGINEERING_RULES.md §5 — voir le
// `select` de listPublishedProfiles, qui n'inclut structurellement pas
// ProfileContact).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const citySlug = url.searchParams.get("city") ?? undefined;
  const categoryKey = url.searchParams.get("category") ?? undefined;
  const languageCode = url.searchParams.get("language") ?? undefined;
  const onlineOnly = url.searchParams.get("online") === "true";

  const profiles = await listPublishedProfiles({ citySlug, categoryKey, languageCode, onlineOnly });

  const withPhotoUrls = await Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      thumbnailUrl: profile.media[0] ? await getPublicPhotoUrl(profile.media[0].id) : null,
      media: undefined,
    })),
  );

  return NextResponse.json({ profiles: withPhotoUrls });
}
