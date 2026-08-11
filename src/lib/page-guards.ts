import "server-only";
import type { User } from "@prisma/client";
import { getCurrentUser } from "@/modules/auth/session";
import { redirect } from "@/i18n/navigation";
import type { Role } from "@/modules/auth/rbac";

/** À utiliser dans un Server Component pour protéger une page derrière l'authentification. */
export async function requirePageUser(locale: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  return user as User;
}

export async function requirePageRole(locale: string, roles: Role[]): Promise<User> {
  const user = await requirePageUser(locale);
  if (!roles.includes(user.role)) redirect({ href: "/", locale });
  return user;
}
