"use client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { groupCitiesByCanton } from "@/lib/group-cities";
import { Select } from "@/components/ui/Field";

export interface FilterBarProps {
  locale: string;
  categories: { key: string; label: unknown }[];
  languages: { code: string; label: unknown }[];
  cities: { slug: string; name: string; canton: string }[];
  currentFilters: { city?: string; category?: string; language?: string; online?: boolean };
  /** Sur une page catégorie, la catégorie est portée par l'URL et non par un filtre. */
  hideCategory?: boolean;
}

export function FilterBar({
  locale,
  categories,
  languages,
  cities,
  currentFilters,
  hideCategory = false,
}: FilterBarProps) {
  const t = useTranslations("home.filters");
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: Partial<typeof currentFilters>) {
    const merged = { ...currentFilters, ...next };
    const params = new URLSearchParams();
    if (merged.city) params.set("city", merged.city);
    if (merged.category && !hideCategory) params.set("category", merged.category);
    if (merged.language) params.set("language", merged.language);
    if (merged.online) params.set("online", "true");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
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
    </div>
  );
}
