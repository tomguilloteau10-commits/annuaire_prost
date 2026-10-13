"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, Select, TextArea } from "@/components/ui/Field";

const REASONS = ["UNDERAGE", "COERCION", "FAKE_PROFILE", "SCAM", "OTHER"] as const;
type Reason = (typeof REASONS)[number];

/** Signalement anonyme : aucun compte requis, aucune donnée sur l'auteur. */
export function ReportForm({ slug }: { slug: string }) {
  const t = useTranslations("report");
  const csrfToken = useCsrfToken();
  const [reason, setReason] = useState<Reason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!csrfToken || !reason) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/profiles/${slug}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ reason, details: details.trim() || undefined }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(response.status === 429 ? t("rateLimited") : t("error"));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink2">{t("thanks")}</p>
        <Link href={`/profiles/${slug}`} className="text-sm text-accent transition-colors hover:text-accent-hover">
          ← {t("backToProfile")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup>
        <Label htmlFor="report-reason">{t("reasonLabel")}</Label>
        <Select
          id="report-reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value as Reason)}
        >
          <option value="" disabled>
            {t("reasonPlaceholder")}
          </option>
          {REASONS.map((key) => (
            <option key={key} value={key}>
              {t(`reasons.${key}`)}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="report-details">{t("detailsLabel")}</Label>
        <TextArea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={4}
        />
        <p className="text-xs text-ink2-faint">{t("detailsHint")}</p>
      </FieldGroup>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={submitting || !csrfToken || !reason}>
          {t("submit")}
        </Button>
        <Link href={`/profiles/${slug}`} className="text-sm text-ink2-muted transition-colors hover:text-ink2">
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
