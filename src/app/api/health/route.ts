import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Toujours exécutée à la demande, jamais mise en cache.
export const dynamic = "force-dynamic";

/**
 * Bilan de santé pour Docker et pour un service de surveillance (alerte si
 * le site tombe) : répond 200 si l'application et la base répondent, 503
 * sinon. Ne renvoie aucune donnée.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
