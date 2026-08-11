import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import {
  recordOnboardingAttestation,
  AttestationIncompleteError,
} from "@/modules/onboarding/attestation.service";
import { checkCsrf } from "@/lib/route-helpers";
import { extractClientIp } from "@/lib/ip-hash";

const attestationSchema = z.object({
  attestedAdult: z.literal(true),
  attestedVoluntary: z.literal(true),
  attestedAuthorizedToWorkInSwitzerland: z.literal(true),
  attestedCantonalDeclaration: z.literal(true),
});

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = attestationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const attestation = await recordOnboardingAttestation({
      providerId: user.id,
      ...parsed.data,
      requesterIp: extractClientIp(request),
    });
    return NextResponse.json({ attestedAt: attestation.attestedAt }, { status: 201 });
  } catch (error) {
    if (error instanceof AttestationIncompleteError) {
      return NextResponse.json({ error: "attestation_incomplete" }, { status: 400 });
    }
    throw error;
  }
}
