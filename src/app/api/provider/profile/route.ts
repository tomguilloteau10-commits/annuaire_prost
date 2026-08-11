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

const upsertSchema = z.object({
  displayName: z.string().min(2).max(80),
  description: z.string().min(20).max(4000),
  citySlug: z.string().min(1),
  categoryKey: z.string().min(1),
  languageCodes: z.array(z.string()).min(1).max(10),
  serviceKeys: z.array(z.string()).max(20),
  onlineStatus: z.enum(["ONLINE", "AWAY", "OFFLINE"]).optional(),
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
