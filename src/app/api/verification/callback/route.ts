import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { completeVerification } from "@/modules/verification/verification.service";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";

// ⚠️ Cette route authentifie l'appelant par session (l'annonceuse qui
// complète son propre parcours dans le navigateur) — c'est ce qui a du
// sens pour le mock, qui n'a pas de redirection externe. Un vrai provider
// (Sumsub, Veriff, ...) appellerait cette logique depuis une route de
// webhook distincte, authentifiée par la signature du provider et non par
// une session utilisateur — à ajouter à l'intégration du vrai provider,
// sans changer `completeVerification` lui-même.
const callbackSchema = z.object({
  verificationRecordId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    assertValidCsrf(request);
  } catch (error) {
    if (error instanceof CsrfError) {
      return NextResponse.json({ error: "csrf_invalid" }, { status: 403 });
    }
    throw error;
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const record = await prisma.verificationRecord.findUnique({
    where: { id: parsed.data.verificationRecordId },
  });
  if (!record || record.providerId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updated = await completeVerification(record.id);
  return NextResponse.json({
    status: updated.status,
    isAdult: updated.isAdult,
    expiresAt: updated.expiresAt,
  });
}
