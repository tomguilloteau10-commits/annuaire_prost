"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export interface CityItem {
  id: string;
  name: string;
  canton: string;
  isActive: boolean;
}

// Localisation approximative uniquement (contrainte #8) : nom + canton,
// jamais d'adresse — lat/lng ne sont pas éditables depuis cette UI bêta
// (ajoutés à la création via seed/admin technique si besoin pour PostGIS).
export function CityList({ items }: { items: CityItem[] }) {
  const t = useTranslations("adminTaxonomies");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [name, setName] = useState("");
  const [canton, setCanton] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function toggleActive(id: string, isActive: boolean) {
    if (!csrfToken) return;
    await fetch(`/api/admin/taxonomies/cities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function handleCreate() {
    if (!csrfToken || !name || canton.length !== 2) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/admin/taxonomies/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ name, canton: canton.toUpperCase() }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("createError"));
      return;
    }
    setName("");
    setCanton("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2">{t("cityName")}</th>
            <th className="pb-2">{t("cityCanton")}</th>
            <th className="pb-2">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((city) => (
            <tr key={city.id} className="border-t border-gray-100">
              <td className="py-2">{city.name}</td>
              <td className="py-2">{city.canton}</td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => toggleActive(city.id, city.isActive)}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    city.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {city.isActive ? t("active") : t("inactive")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t("cityName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t("cityCanton")}</label>
          <input
            value={canton}
            maxLength={2}
            onChange={(e) => setCanton(e.target.value)}
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || !csrfToken}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("add")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
