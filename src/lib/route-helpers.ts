import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { assertValidCsrf, CsrfError } from "./csrf";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError, type Role } from "@/modules/auth/rbac";

/**
 * Factorise le bloc répété dans chaque route mutante :
 * `try { assertValidCsrf(request) } catch { ... }`. Renvoie une réponse
 * d'erreur à retourner immédiatement si le jeton est invalide, `null`
 * sinon.
 */
export function checkCsrf(request: Request): NextResponse | null {
  try {
    assertValidCsrf(request);
    return null;
  } catch (error) {
    if (error instanceof CsrfError) {
      return NextResponse.json({ error: "csrf_invalid" }, { status: 403 });
    }
    throw error;
  }
}

export type RequireRoleResult = { user: User; error?: undefined } | { user?: undefined; error: NextResponse };

/**
 * Factorise le bloc "récupérer l'utilisateur courant + vérifier son rôle"
 * répété dans toutes les routes protégées. Usage :
 * `const guard = await requireRole(["MODERATOR", "ADMIN"]); if (guard.error) return guard.error;`
 */
export async function requireRole(roles: Role[]): Promise<RequireRoleResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  try {
    assertRole(user.role, roles);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
    }
    throw error;
  }
  return { user };
}
