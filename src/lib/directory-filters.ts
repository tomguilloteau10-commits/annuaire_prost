import type { ListPublishedProfilesFilters, NumberRange } from "@/modules/profiles/types";
import { isCantonCode } from "@/lib/cantons";
import {
  BODY_TYPES,
  CLIENTELE,
  CONTACT_METHODS,
  CUP_SIZES,
  EYE_COLORS,
  HAIR_COLORS,
  MEETINGS,
  ORIGINS,
  PAYMENT_METHODS,
  PUBIC_HAIR,
} from "@/modules/profiles/attributes";

/**
 * Paramètres d'URL de l'annuaire (accueil, pages catégorie, API publique).
 * Les listes sont séparées par des virgules (`hair=BLONDE,BROWN`), les
 * curseurs ont une borne basse et haute (`ageMin=25&ageMax=35`).
 */
export type DirectorySearchParams = Partial<Record<(typeof PARAM_KEYS)[number], string>>;

const LIST_FILTERS = {
  body: BODY_TYPES,
  hair: HAIR_COLORS,
  eyes: EYE_COLORS,
  origin: ORIGINS,
  pubic: PUBIC_HAIR,
  meeting: MEETINGS,
  payment: PAYMENT_METHODS,
  contact: CONTACT_METHODS,
  clientele: CLIENTELE,
} as const;
export type ListFilterKey = keyof typeof LIST_FILTERS;
export const LIST_FILTER_KEYS = Object.keys(LIST_FILTERS) as ListFilterKey[];

/** Curseurs : âge (ans), taille (cm), tarif (CHF), poitrine (index dans CUP_SIZES). */
export const RANGE_FILTER_KEYS = ["age", "height", "price", "cup"] as const;
export type RangeFilterKey = (typeof RANGE_FILTER_KEYS)[number];

const PARAM_KEYS = [
  "canton",
  "city",
  "category",
  "language",
  "online",
  "tattoos",
  "services",
  ...LIST_FILTER_KEYS,
  ...RANGE_FILTER_KEYS.flatMap((key) => [`${key}Min`, `${key}Max`] as const),
] as const;

/** État des filtres tel qu'affiché par la barre de filtres. */
export interface DirectoryFilterState {
  /** Code canton (GE, VD…) ; la ville, si choisie, appartient à ce canton. */
  canton?: string;
  city?: string;
  category?: string;
  language?: string;
  online?: boolean;
  tattoos?: "yes" | "no";
  /** Clés de services : le profil doit les proposer tous. */
  services?: string[];
  lists: Partial<Record<ListFilterKey, string[]>>;
  ranges: Partial<Record<RangeFilterKey, NumberRange>>;
}

function parseList(value: string | undefined, allowed: readonly string[]): string[] | undefined {
  const values = [...new Set((value ?? "").split(",").filter((v) => allowed.includes(v)))];
  return values.length > 0 ? values : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,5}$/.test(value)) return undefined;
  return Number(value);
}

/** La poitrine s'écrit en lettres dans l'URL (`cupMin=B`), en index dans les filtres. */
function parseCup(value: string | undefined): number | undefined {
  const index = value ? CUP_SIZES.indexOf(value as (typeof CUP_SIZES)[number]) : -1;
  return index >= 0 ? index : undefined;
}

export function parseDirectoryFilters(params: DirectorySearchParams): DirectoryFilterState {
  const lists: DirectoryFilterState["lists"] = {};
  for (const key of LIST_FILTER_KEYS) {
    const values = parseList(params[key], LIST_FILTERS[key]);
    if (values) lists[key] = values;
  }
  const ranges: DirectoryFilterState["ranges"] = {};
  for (const key of RANGE_FILTER_KEYS) {
    const parse = key === "cup" ? parseCup : parseNumber;
    let min = parse(params[`${key}Min`]);
    let max = parse(params[`${key}Max`]);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    if (min !== undefined || max !== undefined) ranges[key] = { min, max };
  }
  const services = [...new Set((params.services ?? "").split(",").filter((s) => /^[\w-]{1,40}$/.test(s)))];

  return {
    canton: params.canton && isCantonCode(params.canton) ? params.canton : undefined,
    city: params.city || undefined,
    category: params.category || undefined,
    language: params.language || undefined,
    online: params.online === "true" || undefined,
    tattoos: params.tattoos === "yes" || params.tattoos === "no" ? params.tattoos : undefined,
    services: services.length > 0 ? services : undefined,
    lists,
    ranges,
  };
}

export function toProfileFilters(state: DirectoryFilterState): ListPublishedProfilesFilters {
  return {
    canton: state.canton,
    citySlug: state.city,
    categoryKey: state.category,
    languageCode: state.language,
    onlineOnly: state.online,
    age: state.ranges.age,
    heightCm: state.ranges.height,
    price: state.ranges.price,
    cup: state.ranges.cup,
    bodyTypes: state.lists.body,
    hairColors: state.lists.hair,
    eyeColors: state.lists.eyes,
    origins: state.lists.origin,
    pubicHair: state.lists.pubic,
    tattoos: state.tattoos === undefined ? undefined : state.tattoos === "yes",
    meetings: state.lists.meeting,
    paymentMethods: state.lists.payment,
    contactMethods: state.lists.contact,
    clientele: state.lists.clientele,
    serviceKeys: state.services,
  };
}

/** Nombre de filtres actifs hors filtres de base (pour le bouton « Plus de filtres »). */
export function countAdvancedFilters(state: DirectoryFilterState): number {
  return (
    Object.keys(state.lists).length +
    Object.keys(state.ranges).length +
    (state.tattoos ? 1 : 0) +
    (state.services?.length ? 1 : 0)
  );
}

export function toDirectoryQuery(state: DirectoryFilterState): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | undefined) => {
    if (value) params.set(key, value);
  };
  set("canton", state.canton);
  set("city", state.city);
  set("category", state.category);
  set("language", state.language);
  set("online", state.online ? "true" : undefined);
  for (const key of RANGE_FILTER_KEYS) {
    const range = state.ranges[key];
    const format = (n: number | undefined) =>
      n === undefined ? undefined : key === "cup" ? CUP_SIZES[n] : String(n);
    set(`${key}Min`, format(range?.min));
    set(`${key}Max`, format(range?.max));
  }
  for (const key of LIST_FILTER_KEYS) set(key, state.lists[key]?.join(","));
  set("tattoos", state.tattoos);
  set("services", state.services?.join(","));
  return params.toString();
}

/** Au moins un filtre actif (sur une page catégorie, la catégorie vient de l'URL, pas d'un filtre). */
export function hasActiveFilters(state: DirectoryFilterState): boolean {
  return toDirectoryQuery(state) !== "";
}
