import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCity } from "@/modules/taxonomies/taxonomy.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  canton: z.string().min(2).max(2).optional(),
  country: z.string().length(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { id } = await params;
  const city = await updateCity(id, parsed.data);
  return NextResponse.json({ city });
}
