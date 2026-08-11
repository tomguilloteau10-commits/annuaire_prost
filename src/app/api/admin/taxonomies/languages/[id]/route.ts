import { NextResponse } from "next/server";
import { z } from "zod";
import { updateLanguage } from "@/modules/taxonomies/taxonomy.service";
import { labelSchema } from "@/modules/taxonomies/types";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const updateSchema = z.object({ label: labelSchema.optional(), isActive: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id } = await params;
  const language = await updateLanguage(id, parsed.data);
  return NextResponse.json({ language });
}
