import { NextResponse } from "next/server";
import { z } from "zod";
import {
  decideIdentity,
  IDENTITY_DOCUMENT_TYPES,
  ReviewReasonRequiredError,
} from "@/modules/verification/manual-review.service";
import { VerificationRequiredError } from "@/modules/moderation/moderation-queue.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(1000).optional(),
  documentType: z.enum(IDENTITY_DOCUMENT_TYPES).optional(),
  issuingCountry: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional()
    .or(z.literal("")),
  alsoPublishProfile: z.boolean().optional(),
});

/** Décision de l'admin sur une pièce d'identité : les pièces sont supprimées dans tous les cas. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id } = await params;
  try {
    const record = await decideIdentity({
      verificationRecordId: id,
      adminId: guard.user.id,
      ...parsed.data,
      issuingCountry: parsed.data.issuingCountry || undefined,
    });
    if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ status: record.status });
  } catch (error) {
    if (error instanceof ReviewReasonRequiredError) {
      return NextResponse.json({ error: "reason_required" }, { status: 400 });
    }
    if (error instanceof VerificationRequiredError) {
      return NextResponse.json({ error: "verification_required" }, { status: 409 });
    }
    throw error;
  }
}
