import type { Role } from "@/modules/auth/rbac";

/**
 * Les trois espaces de la plateforme et leurs adresses (sans locale) :
 * - client (visiteur, non connecté) : le site public ;
 * - prestataire : /dashboard (tableau de bord, édition du profil) ;
 * - admin : /admin.
 * Chaque espace est gardé côté serveur par son layout (voir
 * app/[locale]/dashboard/layout.tsx et app/[locale]/admin/layout.tsx).
 */
export const DASHBOARD_PATH = "/dashboard";
export const PROFILE_EDIT_PATH = "/dashboard/profile";
export const ONBOARDING_PATH = "/dashboard/onboarding";
export const VERIFICATION_PATH = "/dashboard/verification";
export const ADMIN_PATH = "/admin";

/** Où envoyer un utilisateur connecté : son propre espace. */
export function homeForRole(role: Role): string {
  if (role === "PROVIDER") return DASHBOARD_PATH;
  if (role === "ADMIN") return ADMIN_PATH;
  return "/";
}
