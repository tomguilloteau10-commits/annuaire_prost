import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertValidDocument,
  InvalidDocumentError,
  submitIdentityDocuments,
  submitWorkPermit,
} from "@/modules/verification/manual-review.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { checkCsrf, requireRole } from "@/lib/route-helpers";
import { readUpload } from "@/lib/form-upload";

/**
 * Nouveau dépôt après un refus (ou un dossier expiré) : pièce d'identité
 * recto/verso et/ou permis de travail. Ouvre un nouveau dossier pour
 * l'admin ; ne valide rien.
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["PROVIDER"]);
  if (guard.error) return guard.error;
  const providerId = guard.user.id;

  const attestation = await prisma.onboardingAttestation.findUnique({ where: { providerId } });
  if (!attestation) return NextResponse.json({ error: "onboarding_required" }, { status: 409 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const [front, back, permit] = await Promise.all([
    readUpload(formData, "identityFront"),
    readUpload(formData, "identityBack"),
    readUpload(formData, "workPermit"),
  ]);
  const sendsIdentity = front !== null || back !== null;
  if (!sendsIdentity && !permit) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    if (sendsIdentity) {
      assertValidDocument("identityFront", front);
      assertValidDocument("identityBack", back);
    }
    if (permit) assertValidDocument("workPermit", permit);
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      return NextResponse.json({ error: "invalid_document", field: error.field, reason: error.reason }, { status: 400 });
    }
    throw error;
  }

  if (sendsIdentity) {
    if (await hasPassedAdultVerification(providerId)) {
      return NextResponse.json({ error: "already_verified" }, { status: 409 });
    }
    await submitIdentityDocuments(providerId, front!, back!);
  }
  if (permit) {
    if (attestation.workPermitStatus === "VERIFIED") {
      return NextResponse.json({ error: "already_verified" }, { status: 409 });
    }
    await submitWorkPermit(providerId, permit);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
