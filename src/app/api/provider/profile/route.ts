import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import {
  getProviderDashboardData,
  upsertOwnProfile,
} from "@/modules/profiles/profile.service";
import { UnknownTaxonomyReferenceError } from "@/modules/profiles/types";
import { checkCsrf } from "@/lib/route-helpers";
import {
  BODY_TYPES,
  CLIENTELE,
  EYE_COLORS,
  HAIR_COLORS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  ORIGINS,
  PAYMENT_METHODS,
  RATE_MAX_CHF,
  TIME_SLOTS,
  TRAVEL_RADII_KM,
  WEEK_DAYS,
  sortWeekDays,
} from "@/modules/profiles/attributes";
import { DEMO_SALONS } from "@/modules/showcase/demo-salons";

async function requireProvider() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    throw error;
  }
  return { user };
}

export async function GET() {
  const guard = await requireProvider();
  if (guard.error) return guard.error;

  const data = await getProviderDashboardData(guard.user.id);
  return NextResponse.json(data);
}

const rate = z.number().int().min(0).max(RATE_MAX_CHF).nullable();
const timeSlot = z.enum(TIME_SLOTS as [string, ...string[]]).nullable();

// Infos complémentaires, toutes facultatives (null = non renseigné).
const detailsSchema = z
  .object({
    heightCm: z.number().int().min(HEIGHT_MIN_CM).max(HEIGHT_MAX_CM).nullable(),
    bodyType: z.enum(BODY_TYPES).nullable(),
    hairColor: z.enum(HAIR_COLORS).nullable(),
    eyeColor: z.enum(EYE_COLORS).nullable(),
    rate30Min: rate,
    rate1Hour: rate,
    rate2Hours: rate,
    rateNight: rate,
    availableDays: z.array(z.enum(WEEK_DAYS)).max(7).transform(sortWeekDays),
    availableFrom: timeSlot,
    availableTo: timeSlot,
    receives: z.boolean(),
    travels: z.boolean(),
    travelRadiusKm: z
      .number()
      .int()
      .refine((km) => (TRAVEL_RADII_KM as readonly number[]).includes(km))
      .nullable(),
    tattoos: z.boolean().nullable(),
    piercings: z.boolean().nullable(),
    origin: z.enum(ORIGINS).nullable(),
    clientele: z.array(z.enum(CLIENTELE)).max(CLIENTELE.length).transform((v) => [...new Set(v)]),
    paymentMethods: z
      .array(z.enum(PAYMENT_METHODS))
      .max(PAYMENT_METHODS.length)
      .transform((v) => [...new Set(v)]),
    salonSlug: z
      .string()
      .refine((slug) => DEMO_SALONS.some((salon) => salon.slug === slug))
      .nullable(),
  })
  // Le rayon de déplacement n'a de sens que si la prestataire se déplace.
  .transform((d) => (d.travels ? d : { ...d, travelRadiusKm: null }))
  // Une plage horaire se donne entière (début ET fin) ou pas du tout.
  .refine((d) => (d.availableFrom === null) === (d.availableTo === null), {
    path: ["availableTo"],
  });

const upsertSchema = z.object({
  displayName: z.string().min(2).max(80),
  age: z.number().int().min(18).max(99),
  description: z.string().min(20).max(4000),
  citySlug: z.string().min(1),
  categoryKey: z.string().min(1),
  languageCodes: z.array(z.string()).min(1).max(10),
  serviceKeys: z.array(z.string()).max(20),
  onlineStatus: z.enum(["ONLINE", "AWAY", "OFFLINE"]).optional(),
  details: detailsSchema.optional(),
});

export async function PUT(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireProvider();
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await upsertOwnProfile(guard.user.id, parsed.data);
    return NextResponse.json({ profileId: profile.id, slug: profile.slug, status: profile.status });
  } catch (error) {
    if (error instanceof UnknownTaxonomyReferenceError) {
      return NextResponse.json({ error: "unknown_taxonomy_reference", message: error.message }, { status: 400 });
    }
    throw error;
  }
}
