import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dummyPasswordHash, verifyPassword } from "@/modules/auth/password";
import { createSession, destroyCurrentSession } from "@/modules/auth/session";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";
import { createHash } from "node:crypto";
import { checkRateLimit, isRateLimited, recordAttempt, resetRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_ACCOUNT = 8;
const rateLimited = () => NextResponse.json({ error: "rate_limited" }, { status: 429 });

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
  // 1. Par IP : toutes les tentatives (contournable en falsifiant l'IP, d'où le 2.).
  if (!checkRateLimit({ key: `auth:login:${ipHashForLimit}`, limit: 20, windowMs: WINDOW_MS }).allowed) {
    return rateLimited();
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;

  // 2. Par compte visé, quelle que soit l'IP : au-delà de 8 mots de passe
  // faux en 15 minutes, ce compte est verrouillé 15 minutes (anti force
  // brute ciblée). Un succès remet le compteur à zéro.
  const accountKey = `auth:login-failures:${createHash("sha256").update(email).digest("hex")}`;
  if (isRateLimited({ key: accountKey, limit: MAX_FAILURES_PER_ACCOUNT })) {
    return rateLimited();
  }

  // Insensible à la casse : les comptes créés avant la normalisation des
  // adresses (majuscules) restent accessibles.
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  // Message générique volontaire (pas de distinction "email inconnu" vs
  // "mot de passe incorrect") pour ne pas faciliter l'énumération de
  // comptes — et même durée de traitement dans les deux cas : sans compte,
  // on vérifie quand même contre un hash factice.
  const validPassword = user
    ? await verifyPassword(user.passwordHash, password)
    : (await verifyPassword(await dummyPasswordHash(), password)) && false;

  if (!user || !validPassword) {
    recordAttempt({ key: accountKey, windowMs: WINDOW_MS });
    if (user) logger.warn("auth.login.failed", { userId: user.id });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  resetRateLimit(accountKey);
  // Une seule session par navigateur : l'éventuelle ancienne est révoquée.
  await destroyCurrentSession();
  await createSession({ userId: user.id, role: user.role, request });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  logger.info("auth.login.success", { userId: user.id });

  return NextResponse.json({ userId: user.id, role: user.role });
}
