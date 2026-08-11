import { NextResponse } from "next/server";
import { z } from "zod";
import { createCity, listCities } from "@/modules/taxonomies/taxonomy.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const cities = await listCities({ includeInactive: true });
  return NextResponse.json({ cities });
}

// Localisation approximative uniquement (contrainte #8) : nom + canton,
// jamais d'adresse. lat/lng sont des coordonnées de ville, pas
// individuelles.
const createSchema = z.object({
  name: z.string().min(1).max(80),
  canton: z.string().min(2).max(2),
  country: z.string().length(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const city = await createCity(parsed.data);
  return NextResponse.json({ city }, { status: 201 });
}
