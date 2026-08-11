import type { UserRole } from "@prisma/client";

/**
 * Rôles applicatifs. `GUEST` n'est pas persisté en base (c'est l'état d'un
 * visiteur non authentifié) ; les autres correspondent à `UserRole` côté
 * Prisma.
 */
export type Role = "GUEST" | UserRole;

// Hiérarchie simple pour la bêta : un rôle plus élevé hérite des permissions
// des rôles en dessous. Ne pas complexifier tant qu'on n'a pas de besoin
// concret de permissions croisées (ex: un modérateur qui serait aussi
// prestataire) — cf. règle "pas d'abstraction prématurée".
const ROLE_RANK: Record<Role, number> = {
  GUEST: 0,
  CLIENT: 1,
  PROVIDER: 1,
  MODERATOR: 2,
  ADMIN: 3,
};

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isModeratorOrAdmin(role: Role): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}

export class ForbiddenError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(role: Role, allowed: Role[]): void {
  if (!allowed.includes(role)) {
    throw new ForbiddenError();
  }
}
