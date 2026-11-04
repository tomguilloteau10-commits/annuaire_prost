import { NextResponse } from "next/server";
import { z } from "zod";
import { decideWorkPermit, ReviewReasonRequiredError } from "@/modules/verification/manual-review.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
});

/** Décision de l'admin sur le permis de travail : le document est supprimé dans tous les cas. */
export async function POST(request: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { providerId } = await params;
  try {
    const result = await decideWorkPermit({ providerId, adminId: guard.user.id, ...parsed.data });
    if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ status: result.workPermitStatus });
  } catch (error) {
    if (error instanceof ReviewReasonRequiredError) {
      return NextResponse.json({ error: "reason_required" }, { status: 400 });
    }
    throw error;
  }
}
