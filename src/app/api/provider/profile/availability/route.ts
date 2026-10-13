import { NextResponse } from "next/server";
import { z } from "zod";
import { setOwnAvailability } from "@/modules/profiles/profile.service";
import { requireRole, checkCsrf } from "@/lib/route-helpers";
import { Prisma } from "@prisma/client";

const availabilitySchema = z.object({ available: z.boolean() });

// Interrupteur "Disponible maintenant" du tableau de bord.
export async function PUT(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["PROVIDER"]);
  if (guard.error) return guard.error;

  const body = await request.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const profile = await setOwnAvailability(guard.user.id, parsed.data.available);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }
    throw error;
  }
}
