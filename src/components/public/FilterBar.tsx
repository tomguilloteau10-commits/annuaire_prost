"use client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { groupCitiesByCanton } from "@/lib/group-cities";
import { toDirectoryQuery, type DirectoryFilterState } from "@/lib/directory-filters";
import type { PublishedProfileFacets } from "@/modules/profiles/types";
import { Select } from "@/components/ui/Field";

export interface FilterBarProps {
  locale: string;
  categories: { key: string; label: unknown }[];
  languages: { code: string; label: unknown }[];
  cities: { slug: string; name: string; canton: string }[];
  /** Valeurs réellement renseignées par des profils publiés (voir getPublishedProfileFacets). */
  facets: PublishedProfileFacets;
  currentFilters: DirectoryFilterState;
  /** Sur une page catégorie, la catégorie est portée par l'URL et non par un filtre. */
  hideCategory?: boolean;
}

const MORE_FILTER_KEYS = ["body", "meeting", "price", "clientele"] as const;

/**
 * Filtres de l'annuaire. Les filtres de base (ville, catégorie, langue, en
 * ligne) sont toujours là ; les filtres issus de la fiche prestataire
 * (silhouette, se déplace/reçoit, tarif, clientèle) n'apparaissent — avec
 * leurs seules options utiles — que si des profils publiés ont renseigné ces
 * champs, pour ne jamais proposer un filtre qui ne mène à rien.
 */
export function FilterBar({
  locale,
  categories,
  languages,
  cities,
  facets,
  currentFilters,
  hideCategory = false,
}: FilterBarProps) {
  const t = useTranslations("home.filters");
  const ta = useTranslations("attributes");
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: Partial<DirectoryFilterState>) {
    const merged = { ...currentFilters, ...next, ...(hideCategory ? { category: undefined } : {}) };
    const query = toDirectoryQuery(merged);
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const hasMoreFilters =
    facets.bodyTypes.length > 0 ||
    facets.meetings.length > 0 ||
    facets.priceRanges.length > 0 ||
    facets.clientele.length > 0;
  const activeMoreCount = MORE_FILTER_KEYS.filter((key) => currentFilters[key]).length;
  const anyActive = Object.entries(currentFilters).some(([key, value]) => value && !(hideCategory && key === "category"));

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
        <Select
          fit
          aria-label={t("city")}
          value={currentFilters.city ?? ""}
          onChange={(e) => navigate({ city: e.target.value || undefined })}
        >
          <option value="">{t("city")}</option>
          {groupCitiesByCanton(cities).map((group) => (
            <optgroup key={group.canton} label={group.canton}>
              {group.cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        {!hideCategory && (
          <Select
            fit
            aria-label={t("category")}
            value={currentFilters.category ?? ""}
            onChange={(e) => navigate({ category: e.target.value || undefined })}
          >
            <option value="">{t("category")}</option>
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {getLocalizedLabel(category.label, locale)}
              </option>
            ))}
          </Select>
        )}

        <Select
          fit
          aria-label={t("language")}
          value={currentFilters.language ?? ""}
          onChange={(e) => navigate({ language: e.target.value || undefined })}
        >
          <option value="">{t("language")}</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {getLocalizedLabel(language.label, locale)}
            </option>
          ))}
        </Select>

        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-hairline2 bg-surface-raised px-3.5 py-2.5 text-sm text-ink2-muted">
          <input
            type="checkbox"
            checked={currentFilters.online ?? false}
            onChange={(e) => navigate({ online: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-hairline2 bg-surface text-accent accent-accent"
          />
          {t("onlineOnly")}
        </label>

        {anyActive && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-left text-sm text-ink2-faint underline-offset-4 transition-colors hover:text-ink2 hover:underline md:ml-auto"
          >
            {t("reset")}
          </button>
        )}
      </div>

      {hasMoreFilters && (
        <details open={activeMoreCount > 0} className="group rounded-xl border border-hairline bg-surface/60">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-ink2-muted marker:hidden">
            <span>
              {t("more")}
              {activeMoreCount > 0 && <span className="ml-1.5 text-accent">({activeMoreCount})</span>}
            </span>
            <span aria-hidden className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="flex flex-col gap-2.5 border-t border-hairline p-3 md:flex-row md:flex-wrap">
            {facets.bodyTypes.length > 0 && (
              <Select
                fit
                aria-label={t("bodyType")}
                value={currentFilters.body ?? ""}
                onChange={(e) => navigate({ body: e.target.value || undefined })}
              >
                <option value="">{t("bodyType")}</option>
                {facets.bodyTypes.map((b) => (
                  <option key={b} value={b}>
                    {ta(`bodyType.${b}`)}
                  </option>
                ))}
              </Select>
            )}
            {facets.meetings.length > 0 && (
              <Select
                fit
                aria-label={t("meeting")}
                value={currentFilters.meeting ?? ""}
                onChange={(e) =>
                  navigate({ meeting: (e.target.value || undefined) as DirectoryFilterState["meeting"] })
                }
              >
                <option value="">{t("meeting")}</option>
                {facets.meetings.map((m) => (
                  <option key={m} value={m}>
                    {t(`meetingOptions.${m}`)}
                  </option>
                ))}
              </Select>
            )}
            {facets.priceRanges.length > 0 && (
              <Select
                fit
                aria-label={t("price")}
                value={currentFilters.price ?? ""}
                onChange={(e) => navigate({ price: e.target.value || undefined })}
              >
                <option value="">{t("price")}</option>
                {facets.priceRanges.map((p) => (
                  <option key={p} value={p}>
                    {t(`priceOptions.${p}`)}
                  </option>
                ))}
              </Select>
            )}
            {facets.clientele.length > 0 && (
              <Select
                fit
                aria-label={t("clientele")}
                value={currentFilters.clientele ?? ""}
                onChange={(e) => navigate({ clientele: e.target.value || undefined })}
              >
                <option value="">{t("clientele")}</option>
                {facets.clientele.map((c) => (
                  <option key={c} value={c}>
                    {ta(`clientele.${c}`)}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
