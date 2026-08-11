import { NextResponse } from "next/server";
import { z } from "zod";
import { createService, listServices } from "@/modules/taxonomies/taxonomy.service";
import { labelSchema } from "@/modules/taxonomies/types";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const services = await listServices({ includeInactive: true });
  return NextResponse.json({ services });
}

const createSchema = z.object({
  key: z.string().min(2).max(40),
  label: labelSchema,
  categoryId: z.string().optional(),
});

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const service = await createService(parsed.data.key, parsed.data.label, parsed.data.categoryId);
  return NextResponse.json({ service }, { status: 201 });
}
