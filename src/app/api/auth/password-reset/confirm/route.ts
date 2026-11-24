import { NextResponse } from "next/server";
import { z } from "zod";
import { checkCsrf } from "@/lib/route-helpers";
import { checkRateLimits } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { InvalidResetTokenError, resetPasswordWithToken } from "@/modules/auth/password-reset.service";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(12).max(256),
});

/** Choix du nouveau mot de passe à partir du lien reçu par e-mail. */
export async function POST(request: Request) {
  const csrfError = await checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = extractClientIp(request);
  const allowed = checkRateLimits([
    { key: `auth:reset-confirm:${clientIp ? hashIp(clientIp) : "unknown"}`, limit: 10, windowMs: 15 * 60 * 1000 },
    { key: "auth:reset-confirm:global", limit: 200, windowMs: 60 * 60 * 1000 },
  ]);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
