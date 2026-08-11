import { NextResponse } from "next/server";
import { z } from "zod";
import { decideOnProfile, VerificationRequiredError } from "@/modules/moderation/moderation-queue.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().min(3).max(1000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["MODERATOR", "ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id } = await params;

  try {
    const profile = await decideOnProfile({
      profileId: id,
      moderatorId: guard.user.id,
      decision: parsed.data.decision,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ status: profile.status });
  } catch (error) {
    if (error instanceof VerificationRequiredError) {
      return NextResponse.json({ error: "verification_required" }, { status: 409 });
    }
    throw error;
  }
}
