export interface CityForGrouping {
  slug: string;
  name: string;
  canton: string;
}

const CANTON_ORDER = ["GE", "VD", "VS"];

/**
 * Regroupe les villes par canton (GE, VD, VS dans cet ordre, puis le
 * reste par ordre alphabétique) pour un rendu en <optgroup> cohérent
 * partout où une liste de villes est proposée (inscription/édition de
 * profil, filtre de recherche public, recherche du hero).
 */
export function groupCitiesByCanton<T extends CityForGrouping>(cities: T[]): { canton: string; cities: T[] }[] {
  const byCanton = new Map<string, T[]>();
  for (const city of cities) {
    const list = byCanton.get(city.canton) ?? [];
    list.push(city);
    byCanton.set(city.canton, list);
  }

  const cantons = [...byCanton.keys()].sort((a, b) => {
    const indexA = CANTON_ORDER.indexOf(a);
    const indexB = CANTON_ORDER.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return cantons.map((canton) => ({
    canton,
    cities: (byCanton.get(canton) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
