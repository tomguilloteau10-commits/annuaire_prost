import type { ListPublishedProfilesFilters } from "@/modules/profiles/types";

/** Paramètres d'URL de l'annuaire (accueil, pages catégorie, API publique). */
export interface DirectorySearchParams {
  city?: string;
  category?: string;
  language?: string;
  online?: string;
  body?: string;
  meeting?: string;
  price?: string;
  clientele?: string;
}

/** État des filtres tel qu'affiché par la barre de filtres. */
export interface DirectoryFilterState {
  city?: string;
  category?: string;
  language?: string;
  online?: boolean;
  body?: string;
  meeting?: "receives" | "travels";
  price?: string;
  clientele?: string;
}

export function parseDirectoryFilters(params: DirectorySearchParams): DirectoryFilterState {
  return {
    city: params.city || undefined,
    category: params.category || undefined,
    language: params.language || undefined,
    online: params.online === "true" || undefined,
    body: params.body || undefined,
    meeting: params.meeting === "receives" || params.meeting === "travels" ? params.meeting : undefined,
    price: params.price || undefined,
    clientele: params.clientele || undefined,
  };
}

export function toProfileFilters(state: DirectoryFilterState): ListPublishedProfilesFilters {
  return {
    citySlug: state.city,
    categoryKey: state.category,
    languageCode: state.language,
    onlineOnly: state.online,
    bodyType: state.body,
    meeting: state.meeting,
    priceRange: state.price,
    clientele: state.clientele,
  };
}

export function toDirectoryQuery(state: DirectoryFilterState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state)) {
    if (value === undefined || value === false || value === "") continue;
    params.set(key, value === true ? "true" : String(value));
  }
  return params.toString();
}
