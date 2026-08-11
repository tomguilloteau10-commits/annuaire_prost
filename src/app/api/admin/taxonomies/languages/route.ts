import { NextResponse } from "next/server";
import { z } from "zod";
import { createLanguage, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { labelSchema } from "@/modules/taxonomies/types";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const languages = await listLanguages({ includeInactive: true });
  return NextResponse.json({ languages });
}

const createSchema = z.object({ code: z.string().min(2).max(5), label: labelSchema });

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const language = await createLanguage(parsed.data.code, parsed.data.label);
  return NextResponse.json({ language }, { status: 201 });
}
