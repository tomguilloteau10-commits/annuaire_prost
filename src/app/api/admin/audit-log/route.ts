import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/route-helpers";

// Consultable par ADMIN uniquement — le journal d'audit couvre aussi les
// actions des modérateurs, un modérateur ne doit pas pouvoir relire son
// propre historique pour en juger l'opportunité.
export async function GET(request: Request) {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { email: true, role: true } } },
  });

  return NextResponse.json({ entries });
}
