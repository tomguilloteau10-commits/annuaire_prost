import { NextResponse } from "next/server";
import { listPendingProfiles } from "@/modules/moderation/moderation-queue.service";
import { requireRole } from "@/lib/route-helpers";

export async function GET() {
  const guard = await requireRole(["MODERATOR", "ADMIN"]);
  if (guard.error) return guard.error;

  const profiles = await listPendingProfiles();
  return NextResponse.json({ profiles });
}
