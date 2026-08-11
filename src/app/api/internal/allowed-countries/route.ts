import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route Node.js (pas Edge) interne, appelée uniquement par le middleware
// pour rafraîchir son cache de géo-restriction — voir src/middleware.ts.
// Ne renvoie qu'une liste de codes pays autorisés : aucune donnée
// sensible, mais elle n'a pas vocation à être appelée depuis le client.
export const runtime = "nodejs";
// Ne doit jamais être pré-rendue au build : dépend de la base de données
// et du cache du middleware appelant, pas d'un contenu statique.
export const dynamic = "force-dynamic";

export async function GET() {
  const allowed = await prisma.allowedCountry.findMany({
    where: { isAllowed: true },
    select: { countryCode: true },
  });
  return NextResponse.json({ countryCodes: allowed.map((c) => c.countryCode) });
}
