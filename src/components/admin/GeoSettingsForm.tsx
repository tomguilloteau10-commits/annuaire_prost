"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export interface CountryItem {
  countryCode: string;
  isAllowed: boolean;
}

export function GeoSettingsForm({ countries }: { countries: CountryItem[] }) {
  const t = useTranslations("adminGeoSettings");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function upsert(countryCode: string, isAllowed: boolean) {
    if (!csrfToken) return;
    setError(null);
    const response = await fetch("/api/admin/geo-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ countryCode, isAllowed }),
    });
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    setNewCode("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{t("hint")}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2">{t("countryCode")}</th>
            <th className="pb-2">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.countryCode} className="border-t border-gray-100">
              <td className="py-2 font-mono text-xs">{country.countryCode}</td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => upsert(country.countryCode, !country.isAllowed)}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    country.isAllowed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                  }`}
                >
                  {country.isAllowed ? t("allowed") : t("blocked")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-end gap-2 border-t border-gray-100 pt-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t("countryCode")}</label>
          <input
            value={newCode}
            maxLength={2}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => newCode.length === 2 && upsert(newCode, true)}
          disabled={!csrfToken || newCode.length !== 2}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("addAllowed")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
