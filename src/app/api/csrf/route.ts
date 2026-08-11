import { NextResponse } from "next/server";
import { ensureCsrfCookie } from "@/lib/csrf";

// À appeler par le client avant tout POST/PUT/PATCH/DELETE (ex: au montage
// des pages login/register) pour obtenir un jeton CSRF valide, à renvoyer
// ensuite dans l'en-tête x-csrf-token.
export async function GET() {
  const token = ensureCsrfCookie();
  return NextResponse.json({ csrfToken: token });
}
