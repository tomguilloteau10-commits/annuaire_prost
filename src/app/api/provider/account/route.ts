import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkCsrf, requireRole } from "@/lib/route-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME } from "@/modules/auth/session";
import { verifyPassword } from "@/modules/auth/password";
import { deleteProviderAccount } from "@/modules/account/account-deletion.service";

const schema = z.object({
  password: z.string().min(1).max(256),
  confirm: z.literal(true),
});

/**
 * Suppression de son propre compte par une prestataire. Exige son mot de
 * passe (une session laissée ouverte sur un appareil partagé ne suffit pas)
 * et une confirmation explicite.
 */
export async function DELETE(request: Request) {
  const csrfError = await checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["PROVIDER"]);
  if (guard.error) return guard.error;
  const { user } = guard;

  if (!checkRateLimit({ key: `account:delete:${user.id}`, limit: 5, windowMs: 15 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  if (!(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  await deleteProviderAccount(user.id);
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
