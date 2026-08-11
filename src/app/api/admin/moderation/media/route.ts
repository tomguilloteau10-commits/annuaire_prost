import { NextResponse } from "next/server";
import { listPendingMedia } from "@/modules/moderation/moderation-queue.service";
import { requireRole } from "@/lib/route-helpers";

export async function GET() {
  const guard = await requireRole(["MODERATOR", "ADMIN"]);
  if (guard.error) return guard.error;

  const media = await listPendingMedia();
  return NextResponse.json({ media });
}
