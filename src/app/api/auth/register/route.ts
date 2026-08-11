import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth/password";
import { createSession } from "@/modules/auth/session";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";

// Inscription publique = uniquement des comptes PROVIDER (annonceuses).
// Les comptes CLIENT ne sont pas nécessaires dans cette bêta (navigation et
// révélation de contact restent anonymes) ; les comptes MODERATOR/ADMIN ne
// sont jamais créés par cette route publique, uniquement via le seed ou un
// outillage interne.
const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(256),
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

  const clientIp = extractClientIp(request);
  const rateLimitKey = `auth:register:${clientIp ? hashIp(clientIp) : "unknown"}`;
  const rateLimit = checkRateLimit({ key: rateLimitKey, limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Réponse volontairement identique à un succès générique côté message
    // pour ne pas confirmer l'existence d'un email à un tiers, tout en
    // renvoyant un statut distinct pour l'UX du formulaire.
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "PROVIDER" },
  });

  await createSession({ userId: user.id, request });

  logger.info("auth.register.success", { userId: user.id });

  return NextResponse.json({ userId: user.id }, { status: 201 });
}
