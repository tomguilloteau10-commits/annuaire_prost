import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError } from "@/modules/auth/rbac";
import { getOwnContact, upsertOwnContact } from "@/modules/profiles/profile.service";
import { checkCsrf } from "@/lib/route-helpers";

// Distinct de /api/provider/profile à dessein : le contact vit dans sa
// propre table (ProfileContact) et sa propre route, jamais mélangé au
// reste du profil — cohérent avec la séparation structurelle du schéma
// (ENGINEERING_RULES.md §5).
const contactSchema = z.object({
  phone: z.string().max(32).optional(),
  email: z.string().email().max(254).optional(),
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
  return NextResponse.json({ phone: contact?.phone ?? null, email: contact?.email ?? null });
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
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await upsertOwnContact(user.id, parsed.data);
  return NextResponse.json({ ok: true });
}
