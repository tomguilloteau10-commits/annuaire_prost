import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { getOwnContact, upsertOwnContact } from "@/modules/profiles/profile.service";
import { checkCsrf } from "@/lib/route-helpers";
import { isValidEmail, isValidPhoneNumber, isValidWhatsapp } from "@/modules/profiles/contact-validation";

// Distinct de /api/provider/profile à dessein : le contact vit dans sa
// propre table (ProfileContact) et sa propre route, jamais mélangé au
// reste du profil — cohérent avec la séparation structurelle du schéma
// (ENGINEERING_RULES.md §5).
// Champs facultatifs : chaîne vide ou null = effacer la valeur enregistrée.
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const optionalField = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(emptyToNull, schema.nullable().optional());

const contactSchema = z.object({
  phone: optionalField(z.string().trim().max(32).refine(isValidPhoneNumber)),
  email: optionalField(z.string().trim().max(254).refine(isValidEmail)),
  whatsapp: z.string().trim().max(64).refine(isValidWhatsapp),
  instagram: optionalField(z.string().trim().max(100)),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const contact = await getOwnContact(user.id);
  return NextResponse.json({
    phone: contact?.phone ?? null,
    email: contact?.email ?? null,
    whatsapp: contact?.whatsapp ?? null,
    instagram: contact?.instagram ?? null,
  });
}

export async function PUT(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    assertRole(user.role, ["PROVIDER"]);
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    // Champ fautif renvoyé pour un message précis côté formulaire.
    const field = parsed.error.issues[0]?.path[0];
    return NextResponse.json({ error: "invalid_input", field }, { status: 400 });
  }

  await upsertOwnContact(user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
