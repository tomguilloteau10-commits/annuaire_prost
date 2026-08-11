import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { startVerification } from "@/modules/verification/verification.service";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";

// Démarre la vérification 18+ de l'annonceuse actuellement connectée. Le
// providerId vient exclusivement de la session serveur, jamais du corps de
// la requête : personne ne peut démarrer la vérification de quelqu'un
// d'autre.
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
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    throw error;
  }

  const clientIp = extractClientIp(request);
  const rateLimit = checkRateLimit({
    key: `verification:start:${clientIp ? hashIp(clientIp) : "unknown"}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { verificationRecordId, redirectUrl } = await startVerification(user.id);
  return NextResponse.json({ verificationRecordId, redirectUrl }, { status: 201 });
}
