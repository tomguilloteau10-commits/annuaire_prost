"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

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
    <Card className="flex flex-col gap-3 p-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink2-faint">
            <th className="pb-2 font-medium">{t("cityName")}</th>
            <th className="pb-2 font-medium">{t("cityCanton")}</th>
            <th className="pb-2 font-medium">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((city) => (
            <tr key={city.id} className="border-t border-hairline">
              <td className="py-2 text-ink2">{city.name}</td>
              <td className="py-2 text-ink2-muted">{city.canton}</td>
              <td className="py-2">
                <button type="button" onClick={() => toggleActive(city.id, city.isActive)}>
                  <Badge variant={city.isActive ? "success" : "neutral"}>
                    {city.isActive ? t("active") : t("inactive")}
                  </Badge>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("cityName")}</Label>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} className="w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("cityCanton")}</Label>
          <TextInput value={canton} maxLength={2} onChange={(e) => setCanton(e.target.value)} className="w-16" />
        </div>
        <Button onClick={handleCreate} disabled={submitting || !csrfToken}>
          {t("add")}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
