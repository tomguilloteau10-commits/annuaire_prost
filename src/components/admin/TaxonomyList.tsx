"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { getLocalizedLabel } from "@/modules/taxonomies/types";

export interface TaxonomyItem {
  id: string;
  identifier: string; // key ou code selon le type
  label: unknown;
  isActive: boolean;
}

export interface TaxonomyListProps {
  kind: "categories" | "services" | "languages";
  identifierLabel: string;
  items: TaxonomyItem[];
  locale: string;
}

/**
 * Taxonomies as data (docs/ARCHITECTURE.md) : catégories/services/langues
 * partagent la même forme (identifiant + libellé {fr,en,de?,it?} +
 * isActive), d'où ce composant générique piloté par `kind` plutôt que trois
 * composants quasi identiques.
 */
export function TaxonomyList({ kind, identifierLabel, items, locale }: TaxonomyListProps) {
  const t = useTranslations("adminTaxonomies");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [identifier, setIdentifier] = useState("");
  const [labelFr, setLabelFr] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const identifierField = kind === "languages" ? "code" : "key";

  async function toggleActive(id: string, isActive: boolean) {
    if (!csrfToken) return;
    await fetch(`/api/admin/taxonomies/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function handleCreate() {
    if (!csrfToken || !identifier || !labelFr || !labelEn) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/admin/taxonomies/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ [identifierField]: identifier, label: { fr: labelFr, en: labelEn } }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("createError"));
      return;
    }
    setIdentifier("");
    setLabelFr("");
    setLabelEn("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2">{identifierLabel}</th>
            <th className="pb-2">{t("labelFr")}</th>
            <th className="pb-2">{t("labelEn")}</th>
            <th className="pb-2">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-gray-100">
              <td className="py-2 font-mono text-xs">{item.identifier}</td>
              <td className="py-2">{getLocalizedLabel(item.label, "fr")}</td>
              <td className="py-2">{getLocalizedLabel(item.label, "en")}</td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => toggleActive(item.id, item.isActive)}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    item.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.isActive ? t("active") : t("inactive")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{identifierLabel}</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t("labelFr")}</label>
          <input
            value={labelFr}
            onChange={(e) => setLabelFr(e.target.value)}
            className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{t("labelEn")}</label>
          <input
            value={labelEn}
            onChange={(e) => setLabelEn(e.target.value)}
            className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
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
