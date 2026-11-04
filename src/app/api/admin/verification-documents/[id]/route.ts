import { NextResponse } from "next/server";
import { readVerificationDocumentForAdmin } from "@/modules/verification/manual-review.service";
import { requireRole } from "@/lib/route-helpers";

// SEUL chemin de lecture d'une pièce d'identité / d'un permis déposé
// (ENGINEERING_RULES.md §1) : rôle ADMIN obligatoire, déchiffrement à la
// volée, jamais mis en cache, jamais d'URL partageable ou signée.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const { id } = await params;
  const document = await readVerificationDocumentForAdmin(id);
  if (!document) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const extension = document.contentType === "application/pdf" ? "pdf" : document.contentType === "image/png" ? "png" : "jpg";
  return new NextResponse(new Uint8Array(document.content), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${document.kind.toLowerCase()}.${extension}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
