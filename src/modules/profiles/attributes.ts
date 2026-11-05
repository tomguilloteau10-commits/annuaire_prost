/**
 * Valeurs autorisées pour les infos complémentaires du profil (toutes
 * facultatives). Module pur, sans accès base : partagé par l'API (zod), le
 * formulaire prestataire et la page publique. Les libellés vivent dans
 * les fichiers i18n (namespace "attributes").
 */

export const BODY_TYPES = ["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS"] as const;
export const HAIR_COLORS = ["BLONDE", "LIGHT_BROWN", "BROWN", "BLACK", "RED", "OTHER"] as const;
export const EYE_COLORS = ["BLUE", "GREEN", "BROWN", "HAZEL", "GREY"] as const;
export const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
/** Région d'origine déclarée, géographique et large (jamais un document d'identité). */
export const ORIGINS = [
  "SWITZERLAND",
  "WESTERN_EUROPE",
  "SOUTHERN_EUROPE",
  "EASTERN_EUROPE",
  "NORTHERN_EUROPE",
  "LATIN_AMERICA",
  "NORTH_AMERICA",
  "AFRICA",
  "MIDDLE_EAST",
  "ASIA",
  "OCEANIA",
] as const;
export const CLIENTELE = ["MEN", "WOMEN", "COUPLES"] as const;
/** Moyens de paiement acceptés par la prestataire elle-même (aucun paiement sur la plateforme). */
export const PAYMENT_METHODS = ["CASH", "TWINT", "CARD"] as const;
export const TRAVEL_RADII_KM = [5, 10, 20, 30, 50, 100] as const;
/** Tour de poitrine (bonnet), dans l'ordre : sert aussi de graduation au curseur de recherche. */
export const CUP_SIZES = ["A", "B", "C", "D", "E", "F", "G", "H_PLUS"] as const;
export const PUBIC_HAIR = ["SHAVED", "TRIMMED", "NATURAL"] as const;
/** Canaux par lesquels la prestataire accepte d'être contactée (jamais la coordonnée elle-même). */
export const CONTACT_METHODS = ["WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM"] as const;
/** Champ de ProfileContact correspondant à chaque canal. */
export const CONTACT_METHOD_FIELD = {
  WHATSAPP: "whatsapp",
  PHONE: "phone",
  EMAIL: "email",
  INSTAGRAM: "instagram",
} as const;
export const MEETINGS = ["receives", "travels"] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HairColor = (typeof HAIR_COLORS)[number];
export type EyeColor = (typeof EYE_COLORS)[number];
export type WeekDay = (typeof WEEK_DAYS)[number];
export type Origin = (typeof ORIGINS)[number];
export type Clientele = (typeof CLIENTELE)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CupSize = (typeof CUP_SIZES)[number];
export type PubicHair = (typeof PUBIC_HAIR)[number];
export type ContactMethod = (typeof CONTACT_METHODS)[number];
export type Meeting = (typeof MEETINGS)[number];

export const RATE_FIELDS = ["rate30Min", "rate1Hour", "rate2Hours", "rateNight"] as const;
export type RateField = (typeof RATE_FIELDS)[number];

export const HEIGHT_MIN_CM = 140;
export const HEIGHT_MAX_CM = 210;
/** Choix proposés dans le formulaire : 1,40 m … 1,98 m, puis « 1,99 m et + » (199). */
export const HEIGHT_TOP_CM = 199;
export const HEIGHT_OPTIONS_CM: number[] = Array.from({ length: HEIGHT_TOP_CM - HEIGHT_MIN_CM + 1 }, (_, i) => HEIGHT_MIN_CM + i);
export const RATE_MAX_CHF = 20000;

/** Échelles des curseurs de recherche : la valeur du haut signifie « et plus ». */
export const AGE_SLIDER = { min: 18, max: 60, step: 1 } as const;
export const HEIGHT_SLIDER = { min: HEIGHT_MIN_CM, max: HEIGHT_TOP_CM, step: 1 } as const;
export const PRICE_SLIDER = { min: 0, max: 1000, step: 10 } as const;

/**
 * Tarif de référence d'un profil pour la recherche par prix : le tarif
 * « à partir de » s'il est donné, sinon le tarif 1 heure.
 */
export function referencePrice(profile: { rateFrom: number | null; rate1Hour: number | null }): number | null {
  return profile.rateFrom ?? profile.rate1Hour;
}

/** Créneaux de 30 min, "00:00" … "23:30". */
export const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  return `${hours}:${i % 2 === 0 ? "00" : "30"}`;
});

/** Trie les jours dans l'ordre de la semaine et retire les doublons. */
export function sortWeekDays(days: readonly string[]): WeekDay[] {
  return WEEK_DAYS.filter((day) => days.includes(day));
}

/**
 * Regroupe les jours consécutifs : ["MON","TUE","WED","FRI"] →
 * [["MON","WED"], ["FRI","FRI"]]. Sert à afficher "Lun – Mer, Ven".
 */
export function groupWeekDays(days: readonly string[]): [WeekDay, WeekDay][] {
  const sorted = sortWeekDays(days);
  const groups: [WeekDay, WeekDay][] = [];
  for (const day of sorted) {
    const last = groups[groups.length - 1];
    if (last && WEEK_DAYS.indexOf(day) === WEEK_DAYS.indexOf(last[1]) + 1) last[1] = day;
    else groups.push([day, day]);
  }
  return groups;
}
