import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/modules/auth/password";
import { createSession } from "@/modules/auth/session";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
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
  const ipHashForLimit = clientIp ? hashIp(clientIp) : "unknown";
  // Limite sur l'IP (anti brute-force distribué) ; la limite par compte
  // (anti brute-force ciblé) s'ajoutera si besoin une fois un vrai stockage
  // de rate limit partagé en place (voir lib/rate-limit.ts).
  const rateLimit = checkRateLimit({
    key: `auth:login:${ipHashForLimit}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Message générique volontaire (pas de distinction "email inconnu" vs
  // "mot de passe incorrect") pour ne pas faciliter l'énumération de comptes.
  const genericError = () => NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  if (!user) {
    return genericError();
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    logger.warn("auth.login.failed", { userId: user.id });
    return genericError();
  }

  await createSession({ userId: user.id, request });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  logger.info("auth.login.success", { userId: user.id });

  return NextResponse.json({ userId: user.id, role: user.role });
}
