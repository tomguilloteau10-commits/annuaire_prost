/**
 * Les 26 cantons suisses (code officiel à deux lettres) avec leur nom dans
 * les quatre langues du site. Source unique pour tous les sélecteurs
 * "Canton → Ville" (formulaire prestataire, filtres de recherche, salons).
 * Ordre d'affichage : alphabétique sur le nom traduit.
 */
export const SWISS_CANTONS = {
  AG: { fr: "Argovie", de: "Aargau", it: "Argovia", en: "Aargau" },
  AI: { fr: "Appenzell Rhodes-Intérieures", de: "Appenzell Innerrhoden", it: "Appenzello Interno", en: "Appenzell Innerrhoden" },
  AR: { fr: "Appenzell Rhodes-Extérieures", de: "Appenzell Ausserrhoden", it: "Appenzello Esterno", en: "Appenzell Ausserrhoden" },
  BE: { fr: "Berne", de: "Bern", it: "Berna", en: "Bern" },
  BL: { fr: "Bâle-Campagne", de: "Basel-Landschaft", it: "Basilea Campagna", en: "Basel-Landschaft" },
  BS: { fr: "Bâle-Ville", de: "Basel-Stadt", it: "Basilea Città", en: "Basel-Stadt" },
  FR: { fr: "Fribourg", de: "Freiburg", it: "Friburgo", en: "Fribourg" },
  GE: { fr: "Genève", de: "Genf", it: "Ginevra", en: "Geneva" },
  GL: { fr: "Glaris", de: "Glarus", it: "Glarona", en: "Glarus" },
  GR: { fr: "Grisons", de: "Graubünden", it: "Grigioni", en: "Graubünden" },
  JU: { fr: "Jura", de: "Jura", it: "Giura", en: "Jura" },
  LU: { fr: "Lucerne", de: "Luzern", it: "Lucerna", en: "Lucerne" },
  NE: { fr: "Neuchâtel", de: "Neuenburg", it: "Neuchâtel", en: "Neuchâtel" },
  NW: { fr: "Nidwald", de: "Nidwalden", it: "Nidvaldo", en: "Nidwalden" },
  OW: { fr: "Obwald", de: "Obwalden", it: "Obvaldo", en: "Obwalden" },
  SG: { fr: "Saint-Gall", de: "St. Gallen", it: "San Gallo", en: "St. Gallen" },
  SH: { fr: "Schaffhouse", de: "Schaffhausen", it: "Sciaffusa", en: "Schaffhausen" },
  SO: { fr: "Soleure", de: "Solothurn", it: "Soletta", en: "Solothurn" },
  SZ: { fr: "Schwytz", de: "Schwyz", it: "Svitto", en: "Schwyz" },
  TG: { fr: "Thurgovie", de: "Thurgau", it: "Turgovia", en: "Thurgau" },
  TI: { fr: "Tessin", de: "Tessin", it: "Ticino", en: "Ticino" },
  UR: { fr: "Uri", de: "Uri", it: "Uri", en: "Uri" },
  VD: { fr: "Vaud", de: "Waadt", it: "Vaud", en: "Vaud" },
  VS: { fr: "Valais", de: "Wallis", it: "Vallese", en: "Valais" },
  ZG: { fr: "Zoug", de: "Zug", it: "Zugo", en: "Zug" },
  ZH: { fr: "Zurich", de: "Zürich", it: "Zurigo", en: "Zurich" },
} as const;

export type CantonCode = keyof typeof SWISS_CANTONS;
type CantonLocale = keyof (typeof SWISS_CANTONS)["GE"];

export const CANTON_CODES = Object.keys(SWISS_CANTONS) as CantonCode[];

export function isCantonCode(value: string): value is CantonCode {
  return value in SWISS_CANTONS;
}

export function cantonName(code: string, locale: string): string {
  if (!isCantonCode(code)) return code;
  const names = SWISS_CANTONS[code];
  return names[(locale in names ? locale : "fr") as CantonLocale];
}

/** Les 26 cantons, triés par nom dans la langue de l'interface. */
export function cantonOptions(locale: string): { code: CantonCode; name: string }[] {
  return CANTON_CODES.map((code) => ({ code, name: cantonName(code, locale) })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}

/** Villes d'un canton, triées par nom. */
export function citiesOfCanton<T extends { canton: string; name: string }>(cities: T[], canton: string): T[] {
  return cities.filter((city) => city.canton === canton).sort((a, b) => a.name.localeCompare(b.name));
}
