import { NextResponse } from "next/server";
import { z } from "zod";
import { createProfileReport, REPORT_REASONS } from "@/modules/reports/report.service";
import { checkCsrf } from "@/lib/route-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";

const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(1000).optional(),
});

// Signalement anonyme d'un profil publié : aucun compte requis, rien n'est
// stocké sur l'auteur. Le hash d'IP ne sert qu'à la clé du rate limiting
// en mémoire (anti-spam), jamais persisté.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = extractClientIp(request);
  const rateLimit = checkRateLimit({
    key: `profile-report:${clientIp ? hashIp(clientIp) : "unknown"}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { slug } = await params;
  const report = await createProfileReport({ slug, ...parsed.data });
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
