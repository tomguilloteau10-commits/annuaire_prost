import { NextResponse } from "next/server";
import { listPublishedProfileCityCounts } from "@/modules/profiles/profile.service";

// Sans ceci, Next.js pré-rend cette route au moment du build (elle ne lit
// ni cookies ni searchParams) et fige les compteurs dans une réponse
// statique — jamais mis à jour quand de nouveaux profils sont publiés.
export const dynamic = "force-dynamic";

// Données de la carte interactive : un point par ville avec un total de
// profils publiés, jamais une liste de profils ni leur identité (voir le
// commentaire sur listPublishedProfileCityCounts, ENGINEERING_RULES.md §8).
export async function GET() {
  const cities = await listPublishedProfileCityCounts();
  return NextResponse.json({ cities });
}
