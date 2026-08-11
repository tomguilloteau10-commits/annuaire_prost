import { NextResponse } from "next/server";
import { assertValidCsrf, CsrfError } from "@/lib/csrf";
import { destroyCurrentSession } from "@/modules/auth/session";

export async function POST(request: Request) {
  try {
    assertValidCsrf(request);
  } catch (error) {
    if (error instanceof CsrfError) {
      return NextResponse.json({ error: "csrf_invalid" }, { status: 403 });
    }
    throw error;
  }

  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
