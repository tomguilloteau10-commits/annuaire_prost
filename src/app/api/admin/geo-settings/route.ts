import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, checkCsrf } from "@/lib/route-helpers";
import { recordAuditLog } from "@/modules/moderation/audit-log.service";

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const countries = await prisma.allowedCountry.findMany({ orderBy: { countryCode: "asc" } });
  return NextResponse.json({ countries });
}

const upsertSchema = z.object({
  countryCode: z.string().length(2),
  isAllowed: z.boolean(),
});

export async function PUT(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const country = await prisma.allowedCountry.upsert({
    where: { countryCode: parsed.data.countryCode },
    update: { isAllowed: parsed.data.isAllowed },
    create: parsed.data,
  });

  await recordAuditLog({
    actorId: guard.user.id,
    action: "geo_settings.update",
    targetType: "ALLOWED_COUNTRY",
    targetId: country.id,
    metadata: { countryCode: country.countryCode, isAllowed: country.isAllowed },
  });

  return NextResponse.json({ country });
}
