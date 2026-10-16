import "server-only";
import type { User } from "@prisma/client";
import { getCurrentUser } from "@/modules/auth/session";
import { redirect } from "@/i18n/navigation";
import type { Role } from "@/modules/auth/rbac";
import { homeForRole } from "@/lib/spaces";

/** À utiliser dans un Server Component pour protéger une page derrière l'authentification. */
export async function requirePageUser(locale: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  return user as User;
}

/**
 * Refuse l'accès côté serveur si le rôle ne correspond pas : visiteur →
 * connexion, utilisateur connecté → son propre espace (prestataire →
 * /dashboard, admin → /admin, autre → accueil).
 */
export async function requirePageRole(locale: string, roles: Role[]): Promise<User> {
  const user = await requirePageUser(locale);
  if (!roles.includes(user.role)) redirect({ href: homeForRole(user.role), locale });
  return user;
}

/** Pages connexion/inscription : un utilisateur déjà connecté va directement dans son espace. */
export async function redirectIfSignedIn(locale: string): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect({ href: homeForRole(user.role), locale });
}
