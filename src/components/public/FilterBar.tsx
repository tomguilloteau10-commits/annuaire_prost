"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { cantonOptions, citiesOfCanton } from "@/lib/cantons";
import {
  countAdvancedFilters,
  hasActiveFilters,
  toDirectoryQuery,
  type DirectoryFilterState,
  type ListFilterKey,
  type RangeFilterKey,
} from "@/lib/directory-filters";
import { AGE_SLIDER, CUP_SIZES, HEIGHT_SLIDER, PRICE_SLIDER } from "@/modules/profiles/attributes";
import type { NumberRange, PublishedProfileFacets } from "@/modules/profiles/types";
import { Select } from "@/components/ui/Field";
import { RangeSlider } from "@/components/ui/RangeSlider";

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

/** Nombre de services visibles avant « Afficher plus ». */
const SERVICES_PREVIEW = 10;

const CHIP = "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors";
const CHIP_ON = "border-accent bg-accent text-accent-foreground";
const CHIP_OFF = "border-hairline2 text-ink2-muted hover:border-accent/60 hover:text-ink2";

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm text-ink2-muted">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
      {children}
    </button>
  );
}

/**
 * Filtres de l'annuaire. Les filtres de base (canton puis ville du canton,
 * catégorie, langue, en ligne) sont toujours là. Les filtres issus de la
 * fiche prestataire (curseurs âge / taille / tarif / poitrine, puis choix
 * multiples et services) n'apparaissent — avec leurs seules options utiles —
 * que si des profils publiés ont renseigné ces champs, pour ne jamais
 * proposer un filtre qui ne mène à rien.
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
  const [showAllServices, setShowAllServices] = useState(false);

  function navigate(next: Partial<DirectoryFilterState>) {
    const merged = { ...currentFilters, ...next, ...(hideCategory ? { category: undefined } : {}) };
    const query = toDirectoryQuery(merged);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleListValue(key: ListFilterKey, value: string) {
    const current = currentFilters.lists[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    navigate({ lists: { ...currentFilters.lists, [key]: next.length > 0 ? next : undefined } });
  }

  function setRange(key: RangeFilterKey, range: NumberRange | undefined) {
    navigate({ ranges: { ...currentFilters.ranges, [key]: range } });
  }

  function toggleService(serviceKey: string) {
    const current = currentFilters.services ?? [];
    const next = current.includes(serviceKey) ? current.filter((k) => k !== serviceKey) : [...current, serviceKey];
    navigate({ services: next.length > 0 ? next : undefined });
  }

  // Canton choisi, ou déduit de la ville (anciens liens sans canton).
  const selectedCanton =
    currentFilters.canton ?? cities.find((city) => city.slug === currentFilters.city)?.canton ?? "";

  const meters = (cm: number) => (cm / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
  const sliders = [
    facets.age && {
      key: "age" as const,
      scale: AGE_SLIDER,
      format: (n: number) => (n >= AGE_SLIDER.max ? t("agePlus", { n }) : t("ageValue", { n })),
    },
    facets.heightCm && {
      key: "height" as const,
      scale: HEIGHT_SLIDER,
      format: (n: number) =>
        n >= HEIGHT_SLIDER.max ? t("heightPlus", { m: meters(n) }) : t("heightValue", { m: meters(n) }),
    },
    facets.price && {
      key: "price" as const,
      scale: PRICE_SLIDER,
      format: (n: number) => (n >= PRICE_SLIDER.max ? t("pricePlus", { n }) : t("priceValue", { n })),
    },
    facets.cup && {
      key: "cup" as const,
      scale: { min: 0, max: CUP_SIZES.length - 1, step: 1 },
      format: (n: number) => ta(`cupSize.${CUP_SIZES[n]}`),
    },
  ].filter((s): s is NonNullable<typeof s> => !!s);

  const allListGroups: { key: ListFilterKey; legend: string; options: string[]; label: (v: string) => string }[] = [
    { key: "body", legend: t("bodyType"), options: facets.bodyTypes, label: (v) => ta(`bodyType.${v}`) },
    { key: "hair", legend: t("hair"), options: facets.hairColors, label: (v) => ta(`hairColor.${v}`) },
    { key: "eyes", legend: t("eyes"), options: facets.eyeColors, label: (v) => ta(`eyeColor.${v}`) },
    { key: "origin", legend: t("origin"), options: facets.origins, label: (v) => ta(`origin.${v}`) },
    { key: "pubic", legend: t("pubicHair"), options: facets.pubicHair, label: (v) => ta(`pubicHair.${v}`) },
    { key: "meeting", legend: t("meeting"), options: facets.meetings, label: (v) => t(`meetingOptions.${v}`) },
    { key: "payment", legend: t("payment"), options: facets.paymentMethods, label: (v) => ta(`payment.${v}`) },
    { key: "contact", legend: t("contact"), options: facets.contactMethods, label: (v) => ta(`contactMethod.${v}`) },
    { key: "clientele", legend: t("clientele"), options: facets.clientele, label: (v) => ta(`clientele.${v}`) },
  ];
  const listGroups = allListGroups.filter((group) => group.options.length > 0);

  const services = [...facets.services].sort((a, b) =>
    getLocalizedLabel(a.label, locale).localeCompare(getLocalizedLabel(b.label, locale), locale),
  );
  const selectedServices = currentFilters.services ?? [];
  const visibleServices = showAllServices ? services : services.slice(0, SERVICES_PREVIEW);
  const hiddenSelected = services
    .slice(SERVICES_PREVIEW)
    .filter((s) => selectedServices.includes(s.key)).length;

  const hasMoreFilters =
    sliders.length > 0 || listGroups.length > 0 || facets.tattoos.length > 0 || services.length > 0;
  const activeMoreCount = countAdvancedFilters(currentFilters);
  const anyActive = hasActiveFilters({ ...currentFilters, category: hideCategory ? undefined : currentFilters.category });

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
        <Select
          fit
          aria-label={t("canton")}
          value={selectedCanton}
          onChange={(e) => navigate({ canton: e.target.value || undefined, city: undefined })}
        >
          <option value="">{t("canton")}</option>
          {cantonOptions(locale).map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </Select>

        <Select
          fit
          aria-label={t("city")}
          value={currentFilters.city ?? ""}
          disabled={!selectedCanton}
          onChange={(e) => navigate({ canton: selectedCanton || undefined, city: e.target.value || undefined })}
        >
          <option value="">{selectedCanton ? t("allCities") : t("city")}</option>
          {citiesOfCanton(cities, selectedCanton).map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}
            </option>
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
            onClick={() => router.push(pathname, { scroll: false })}
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

          <div className="flex flex-col gap-6 border-t border-hairline p-4">
            {sliders.length > 0 && (
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                {sliders.map((slider) => (
                  <RangeSlider
                    key={slider.key}
                    id={`filter-${slider.key}`}
                    label={t(slider.key)}
                    min={slider.scale.min}
                    max={slider.scale.max}
                    step={slider.scale.step}
                    value={currentFilters.ranges[slider.key]}
                    format={slider.format}
                    onCommit={(range) => setRange(slider.key, range)}
                  />
                ))}
              </div>
            )}

            {(listGroups.length > 0 || facets.tattoos.length > 0) && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {listGroups.map((group) => (
                  <FilterGroup key={group.key} legend={group.legend}>
                    {group.options.map((option) => (
                      <ToggleChip
                        key={option}
                        on={currentFilters.lists[group.key]?.includes(option) ?? false}
                        onClick={() => toggleListValue(group.key, option)}
                      >
                        {group.label(option)}
                      </ToggleChip>
                    ))}
                  </FilterGroup>
                ))}
                {facets.tattoos.length > 0 && (
                  <FilterGroup legend={t("tattoos")}>
                    {(["yes", "no"] as const)
                      .filter((v) => facets.tattoos.includes(v === "yes"))
                      .map((v) => (
                        <ToggleChip
                          key={v}
                          on={currentFilters.tattoos === v}
                          onClick={() => navigate({ tattoos: currentFilters.tattoos === v ? undefined : v })}
                        >
                          {t(v)}
                        </ToggleChip>
                      ))}
                  </FilterGroup>
                )}
              </div>
            )}

            {services.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm text-ink2-muted">
                  {t("services")}
                  {selectedServices.length > 0 && (
                    <span className="ml-1.5 text-accent">({selectedServices.length})</span>
                  )}
                </legend>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {visibleServices.map((service) => (
                    <label
                      key={service.key}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink2 hover:bg-surface-hover"
                    >
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.key)}
                        onChange={() => toggleService(service.key)}
                        className="h-4 w-4 shrink-0 accent-accent"
                      />
                      {getLocalizedLabel(service.label, locale)}
                    </label>
                  ))}
                </div>
                {services.length > SERVICES_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAllServices((v) => !v)}
                    className="self-start text-sm text-accent underline-offset-4 hover:underline"
                  >
                    {showAllServices
                      ? t("showLess")
                      : t("showMore", { count: services.length - SERVICES_PREVIEW })}
                    {!showAllServices && hiddenSelected > 0 && (
                      <span className="ml-1 text-ink2-faint">{t("selectedHidden", { count: hiddenSelected })}</span>
                    )}
                  </button>
                )}
              </fieldset>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
