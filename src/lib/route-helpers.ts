import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { assertValidCsrf, CsrfError } from "./csrf";
import { AGE_COOKIE_NAME, hasConfirmedAge } from "./age-gate";
import { getCurrentUser } from "@/modules/auth/session";
import { assertRole, ForbiddenError, type Role } from "@/modules/auth/rbac";

/**
 * Factorise le bloc répété dans chaque route mutante :
 * `try { await assertValidCsrf(request) } catch { ... }`. Renvoie une réponse
 * d'erreur à retourner immédiatement si le jeton est invalide, `null`
 * sinon.
 */
export async function checkCsrf(request: Request): Promise<NextResponse | null> {
  try {
    await assertValidCsrf(request);
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
 * `const guard = await requireRole(["ADMIN"]); if (guard.error) return guard.error;`
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

/**
 * Lectures publiques de l'annuaire (liste, fiche, carte, contact, photos) :
 * refusées tant que le visiteur n'a pas confirmé avoir 18 ans ou plus,
 * comme les pages (voir lib/age-gate.ts). Le navigateur envoie le cookie de
 * confirmation automatiquement : invisible pour un visiteur normal.
 */
export async function checkAgeConfirmed(): Promise<NextResponse | null> {
  const value = (await cookies()).get(AGE_COOKIE_NAME)?.value;
  if (hasConfirmedAge(value)) return null;
  return NextResponse.json({ error: "age_confirmation_required" }, { status: 403 });
}
