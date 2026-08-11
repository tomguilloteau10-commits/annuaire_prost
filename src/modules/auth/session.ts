import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";

export const SESSION_COOKIE_NAME = "aprost_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  // Hash non salé volontaire ici : le jeton lui-même a 256 bits d'entropie
  // (contrairement à une IP), un hash simple suffit à ne pas le stocker en
  // clair côté serveur tout en permettant une recherche exacte en base.
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateSessionInput {
  userId: string;
  request: Request;
}

export async function createSession({ userId, request }: CreateSessionInput): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const clientIp = extractClientIp(request);
  const now = new Date();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
      ipHash: clientIp ? hashIp(clientIp) : null,
      ipHashPurgeAt: clientIp ? await computePurgeAt(DATA_CATEGORIES.SESSION_IP_HASH, now) : null,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    },
  });

  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  cookies().delete(SESSION_COOKIE_NAME);
}
