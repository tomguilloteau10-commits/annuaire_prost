/**
 * Valeurs autorisées pour les infos complémentaires du profil (toutes
 * facultatives). Module pur, sans accès base : partagé par l'API (zod), le
 * formulaire prestataire et la page publique. Les libellés vivent dans
 * les fichiers i18n (profile.attributes.*).
 */

export const BODY_TYPES = ["SLIM", "ATHLETIC", "AVERAGE", "CURVY", "PLUS"] as const;
export const HAIR_COLORS = ["BLONDE", "LIGHT_BROWN", "BROWN", "BLACK", "RED", "OTHER"] as const;
export const EYE_COLORS = ["BLUE", "GREEN", "BROWN", "HAZEL", "GREY"] as const;
export const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type HairColor = (typeof HAIR_COLORS)[number];
export type EyeColor = (typeof EYE_COLORS)[number];
export type WeekDay = (typeof WEEK_DAYS)[number];

export const RATE_FIELDS = ["rate30Min", "rate1Hour", "rate2Hours", "rateNight"] as const;
export type RateField = (typeof RATE_FIELDS)[number];

export const HEIGHT_MIN_CM = 140;
export const HEIGHT_MAX_CM = 210;
export const RATE_MAX_CHF = 20000;

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
