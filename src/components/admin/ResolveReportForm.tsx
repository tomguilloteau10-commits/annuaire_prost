"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/** Clôture d'un signalement : note obligatoire, comme toute décision (§7). */
export function ResolveReportForm({ reportId }: { reportId: string }) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resolve() {
    if (!csrfToken || note.trim().length < 3) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ note }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("decisionError"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <TextArea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("reportNotePlaceholder")}
        rows={2}
        className="text-sm"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div>
        <Button
          variant="secondary"
          onClick={resolve}
          disabled={submitting || !csrfToken || note.trim().length < 3}
        >
          {t("resolveReport")}
        </Button>
      </div>
    </div>
  );
}
