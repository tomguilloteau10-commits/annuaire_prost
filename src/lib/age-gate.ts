import { routing } from "@/i18n/routing";

/**
 * Contrôle d'âge à l'entrée du site (18+).
 *
 * Tant que le visiteur n'a pas confirmé avoir 18 ans ou plus, le proxy
 * (src/proxy.ts) sert la page de confirmation À LA PLACE de la page
 * demandée : aucun contenu de l'annuaire n'est envoyé avant la
 * confirmation. Le choix est retenu dans un cookie sans donnée
 * personnelle, valable 90 jours.
 */
export const AGE_COOKIE_NAME = "vg_adult";
export const AGE_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/** Segment de la page de confirmation : /fr/age, /en/age… */
export const AGE_GATE_SEGMENT = "age";

/**
 * Pages lisibles sans confirmation : les textes légaux (liés depuis la page
 * de confirmation elle-même) et la page de confirmation.
 */
export function isAgeGateExempt(pathname: string): boolean {
  const [first, second] = pathname.split("/").filter(Boolean);
  const rest = first && (routing.locales as readonly string[]).includes(first) ? second : first;
  return rest === "legal" || rest === AGE_GATE_SEGMENT;
}

/** Langue de l'adresse demandée (sinon la langue par défaut). */
export function localeFromPathname(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

export function hasConfirmedAge(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}
