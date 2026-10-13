"use client";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { Select } from "@/components/ui/Field";

export interface FilterBarProps {
  locale: string;
  categories: { key: string; label: unknown }[];
  languages: { code: string; label: unknown }[];
  cities: { slug: string; name: string; canton: string }[];
  currentFilters: { city?: string; category?: string; language?: string; online?: boolean };
}

export function FilterBar({ locale, categories, languages, cities, currentFilters }: FilterBarProps) {
  const t = useTranslations("home.filters");
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: Partial<typeof currentFilters>) {
    const merged = { ...currentFilters, ...next };
    const params = new URLSearchParams();
    if (merged.city) params.set("city", merged.city);
    if (merged.category) params.set("category", merged.category);
    if (merged.language) params.set("language", merged.language);
    if (merged.online) params.set("online", "true");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2.5">
      <Select
        aria-label={t("city")}
        value={currentFilters.city ?? ""}
        onChange={(e) => navigate({ city: e.target.value || undefined })}
        className="w-auto"
      >
        <option value="">{t("city")}</option>
        {cities.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name} ({city.canton})
          </option>
        ))}
      </Select>

      <Select
        aria-label={t("category")}
        value={currentFilters.category ?? ""}
        onChange={(e) => navigate({ category: e.target.value || undefined })}
        className="w-auto"
      >
        <option value="">{t("category")}</option>
        {categories.map((category) => (
          <option key={category.key} value={category.key}>
            {getLocalizedLabel(category.label, locale)}
          </option>
        ))}
      </Select>

      <Select
        aria-label={t("language")}
        value={currentFilters.language ?? ""}
        onChange={(e) => navigate({ language: e.target.value || undefined })}
        className="w-auto"
      >
        <option value="">{t("language")}</option>
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {getLocalizedLabel(language.label, locale)}
          </option>
        ))}
      </Select>

      <label className="flex items-center gap-2 rounded-xl border border-hairline2 bg-surface-raised px-3.5 py-2.5 text-sm text-ink2-muted">
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
