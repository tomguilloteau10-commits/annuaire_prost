import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveReport } from "@/modules/reports/report.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const resolveSchema = z.object({
  note: z.string().min(3).max(1000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["MODERATOR", "ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id } = await params;
  const resolved = await resolveReport({ reportId: id, moderatorId: guard.user.id, note: parsed.data.note });
  if (!resolved) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ status: "RESOLVED" });
}
