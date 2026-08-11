import { NextResponse } from "next/server";
import { createCategory, listCategories } from "@/modules/taxonomies/taxonomy.service";
import { labelSchema } from "@/modules/taxonomies/types";
import { requireRole, checkCsrf } from "@/lib/route-helpers";
import { z } from "zod";

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const categories = await listCategories({ includeInactive: true });
  return NextResponse.json({ categories });
}

const createSchema = z.object({ key: z.string().min(2).max(40), label: labelSchema });

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const category = await createCategory(parsed.data.key, parsed.data.label);
  return NextResponse.json({ category }, { status: 201 });
}
