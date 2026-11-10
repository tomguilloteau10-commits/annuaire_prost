import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOnboardingAttestation, AttestationIncompleteError } from "@/modules/onboarding/attestation.service";
import {
  assertValidDocument,
  InvalidDocumentError,
  submitIdentityDocuments,
  submitWorkPermit,
  MAX_DOCUMENT_BYTES,
} from "@/modules/verification/manual-review.service";
import { checkCsrf, requireRole } from "@/lib/route-helpers";
import { extractClientIp } from "@/lib/ip-hash";
import { readCheckbox, readUpload, rejectOversizedUpload } from "@/lib/form-upload";

/**
 * Étape "Majorité & autorisation" : cases d'attestation + pièce d'identité
 * recto/verso (obligatoire) + permis de travail/contrat (facultatif).
 * Soumettre ouvre un dossier que SEUL l'admin pourra valider : rien n'est
 * validé automatiquement ici (ENGINEERING_RULES.md §1-§2).
 */
export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["PROVIDER"]);
  if (guard.error) return guard.error;
  const providerId = guard.user.id;

  const tooLarge = rejectOversizedUpload(request, MAX_DOCUMENT_BYTES, 3);
  if (tooLarge) return tooLarge;
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const checks = {
    attestedAdult: readCheckbox(formData, "attestedAdult"),
    attestedVoluntary: readCheckbox(formData, "attestedVoluntary"),
    attestedAuthorizedToWorkInSwitzerland: readCheckbox(formData, "attestedAuthorizedToWorkInSwitzerland"),
    attestedCantonalDeclaration: readCheckbox(formData, "attestedCantonalDeclaration"),
  };
  const [front, back, permit] = await Promise.all([
    readUpload(formData, "identityFront"),
    readUpload(formData, "identityBack"),
    readUpload(formData, "workPermit"),
  ]);

  // Tout est contrôlé AVANT d'écrire quoi que ce soit.
  try {
    assertValidDocument("identityFront", front);
    assertValidDocument("identityBack", back);
    if (permit) assertValidDocument("workPermit", permit);
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      return NextResponse.json({ error: "invalid_document", field: error.field, reason: error.reason }, { status: 400 });
    }
    throw error;
  }
  if (!Object.values(checks).every(Boolean)) {
    return NextResponse.json({ error: "attestation_incomplete" }, { status: 400 });
  }

  try {
    await recordOnboardingAttestation({ providerId, ...checks, requesterIp: extractClientIp(request) });
  } catch (error) {
    if (error instanceof AttestationIncompleteError) {
      return NextResponse.json({ error: "attestation_incomplete" }, { status: 400 });
    }
    throw error;
  }
  await submitIdentityDocuments(providerId, front!, back!);
  if (permit) await submitWorkPermit(providerId, permit);

  const hasProfile = (await prisma.providerProfile.count({ where: { userId: providerId } })) > 0;
  return NextResponse.json({ status: "PENDING", hasProfile }, { status: 201 });
}
