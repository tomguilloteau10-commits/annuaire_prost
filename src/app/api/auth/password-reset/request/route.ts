import { NextResponse, after } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { checkCsrf } from "@/lib/route-helpers";
import { checkRateLimits } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";
import { logger } from "@/lib/logger";
import { requestPasswordReset } from "@/modules/auth/password-reset.service";

const schema = z.object({
  email: z.string().email().max(254),
  locale: z.string().max(5).default("fr"),
});

/**
 * « Mot de passe oublié » : la réponse est TOUJOURS la même (et immédiate),
 * que l'adresse corresponde à un compte ou non — rien ne permet de savoir
 * qui est inscrit. La recherche du compte et l'envoi de l'e-mail se font
 * après la réponse.
 */
export async function POST(request: Request) {
  const csrfError = await checkCsrf(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const clientIp = extractClientIp(request);
  const emailKey = createHash("sha256").update(parsed.data.email.trim().toLowerCase()).digest("hex");
  const allowed = checkRateLimits([
    { key: `auth:reset-request:${clientIp ? hashIp(clientIp) : "unknown"}`, limit: 5, windowMs: 15 * 60 * 1000 },
    // Pas plus de 3 e-mails par heure vers la même adresse (anti-harcèlement).
    { key: `auth:reset-request-email:${emailKey}`, limit: 3, windowMs: 60 * 60 * 1000 },
    { key: "auth:reset-request:global", limit: 100, windowMs: 60 * 60 * 1000 },
  ]);
  if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  after(async () => {
    try {
      await requestPasswordReset(parsed.data.email, parsed.data.locale);
    } catch (error) {
      logger.error("auth.password_reset.send_failed", { error: error instanceof Error ? error.name : "unknown" });
    }
  });

  return NextResponse.json({ ok: true });
}
