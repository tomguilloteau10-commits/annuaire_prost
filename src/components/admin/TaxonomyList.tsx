"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

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
    <Card className="flex flex-col gap-3 p-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink2-faint">
            <th className="pb-2 font-medium">{identifierLabel}</th>
            <th className="pb-2 font-medium">{t("labelFr")}</th>
            <th className="pb-2 font-medium">{t("labelEn")}</th>
            <th className="pb-2 font-medium">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-hairline">
              <td className="py-2 font-mono text-xs text-ink2-muted">{item.identifier}</td>
              <td className="py-2 text-ink2">{getLocalizedLabel(item.label, "fr")}</td>
              <td className="py-2 text-ink2">{getLocalizedLabel(item.label, "en")}</td>
              <td className="py-2">
                <button type="button" onClick={() => toggleActive(item.id, item.isActive)}>
                  <Badge variant={item.isActive ? "success" : "neutral"}>
                    {item.isActive ? t("active") : t("inactive")}
                  </Badge>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{identifierLabel}</Label>
          <TextInput value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("labelFr")}</Label>
          <TextInput value={labelFr} onChange={(e) => setLabelFr(e.target.value)} className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("labelEn")}</Label>
          <TextInput value={labelEn} onChange={(e) => setLabelEn(e.target.value)} className="w-36" />
        </div>
        <Button onClick={handleCreate} disabled={submitting || !csrfToken}>
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
