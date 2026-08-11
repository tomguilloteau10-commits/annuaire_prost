"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { getLocalizedLabel } from "@/modules/taxonomies/types";

interface LabeledOption {
  label: unknown;
}

export interface CategoryOption extends LabeledOption {
  key: string;
}
export interface ServiceOption extends LabeledOption {
  key: string;
}
export interface LanguageOption extends LabeledOption {
  code: string;
}
export interface CityOption {
  slug: string;
  name: string;
  canton: string;
}

export interface ProfileEditFormProps {
  locale: string;
  categories: CategoryOption[];
  services: ServiceOption[];
  languages: LanguageOption[];
  cities: CityOption[];
  initialValues: {
    displayName: string;
    description: string;
    citySlug: string;
    categoryKey: string;
    languageCodes: string[];
    serviceKeys: string[];
    onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  } | null;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ProfileEditForm({ locale, categories, services, languages, cities, initialValues }: ProfileEditFormProps) {
  const t = useTranslations("profileEdit");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [citySlug, setCitySlug] = useState(initialValues?.citySlug ?? cities[0]?.slug ?? "");
  const [categoryKey, setCategoryKey] = useState(initialValues?.categoryKey ?? categories[0]?.key ?? "");
  const [languageCodes, setLanguageCodes] = useState<string[]>(initialValues?.languageCodes ?? []);
  const [serviceKeys, setServiceKeys] = useState<string[]>(initialValues?.serviceKeys ?? []);
  const [onlineStatus, setOnlineStatus] = useState(initialValues?.onlineStatus ?? "OFFLINE");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setError(null);
    setSaved(false);

    // Validation côté client avant l'appel réseau : la case "au moins une
    // langue" ne peut pas s'exprimer avec l'attribut HTML `required` sur un
    // groupe de checkboxes, donc on la vérifie explicitement plutôt que de
    // laisser l'utilisateur découvrir l'erreur seulement après un
    // aller-retour serveur.
    if (languageCodes.length === 0) {
      setError(t("selectAtLeastOneLanguage"));
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/provider/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({
        displayName,
        description,
        citySlug,
        categoryKey,
        languageCodes,
        serviceKeys,
        onlineStatus,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "invalid_input" ? t("invalidFieldsError") : t("saveError"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
          {t("displayNameLabel")}
        </label>
        <input
          id="displayName"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          {t("descriptionLabel")}
        </label>
        <textarea
          id="description"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="city" className="text-sm font-medium text-gray-700">
            {t("cityLabel")}
          </label>
          <select
            id="city"
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name} ({city.canton})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-gray-700">
            {t("categoryLabel")}
          </label>
          <select
            id="category"
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {getLocalizedLabel(category.label, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-gray-700">{t("languagesLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <label
              key={language.code}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                languageCodes.includes(language.code)
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={languageCodes.includes(language.code)}
                onChange={() => setLanguageCodes((prev) => toggle(prev, language.code))}
              />
              {getLocalizedLabel(language.label, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-gray-700">{t("servicesLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <label
              key={service.key}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                serviceKeys.includes(service.key)
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={serviceKeys.includes(service.key)}
                onChange={() => setServiceKeys((prev) => toggle(prev, service.key))}
              />
              {getLocalizedLabel(service.label, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="onlineStatus" className="text-sm font-medium text-gray-700">
          {t("onlineStatusLabel")}
        </label>
        <select
          id="onlineStatus"
          value={onlineStatus}
          onChange={(e) => setOnlineStatus(e.target.value as typeof onlineStatus)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="ONLINE">{t("onlineStatusOptions.ONLINE")}</option>
          <option value="AWAY">{t("onlineStatusOptions.AWAY")}</option>
          <option value="OFFLINE">{t("onlineStatusOptions.OFFLINE")}</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}

      <button
        type="submit"
        disabled={submitting || !csrfToken}
        className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-50"
      >
        {t("save")}
      </button>
    </form>
  );
}
