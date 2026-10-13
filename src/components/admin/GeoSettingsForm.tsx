"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Label, TextInput } from "@/components/ui/Field";

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
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-xs text-ink2-faint">{t("hint")}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink2-faint">
            <th className="pb-2 font-medium">{t("countryCode")}</th>
            <th className="pb-2 font-medium">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.countryCode} className="border-t border-hairline">
              <td className="py-2 font-mono text-xs text-ink2-muted">{country.countryCode}</td>
              <td className="py-2">
                <button type="button" onClick={() => upsert(country.countryCode, !country.isAllowed)}>
                  <Badge variant={country.isAllowed ? "success" : "danger"}>
                    {country.isAllowed ? t("allowed") : t("blocked")}
                  </Badge>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-end gap-2 border-t border-hairline pt-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("countryCode")}</Label>
          <TextInput
            value={newCode}
            maxLength={2}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            className="w-16"
          />
        </div>
        <Button onClick={() => newCode.length === 2 && upsert(newCode, true)} disabled={!csrfToken || newCode.length !== 2}>
          {t("addAllowed")}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  );
}
