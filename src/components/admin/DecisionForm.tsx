"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export interface DecisionFormProps {
  /** ex: "/api/admin/moderation/profiles/abc123/decision" */
  decisionUrl: string;
}

/**
 * Formulaire de décision de modération réutilisé pour les profils et les
 * médias : une raison est toujours obligatoire (ENGINEERING_RULES.md §7),
 * le bouton "Approuver" est désactivé tant qu'elle est vide pour qu'il n'y
 * ait pas de décision silencieuse possible côté UI.
 */
export function DecisionForm({ decisionUrl }: DecisionFormProps) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!csrfToken || reason.trim().length < 3) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch(decisionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ decision, reason }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "verification_required" ? t("verificationRequiredError") : t("decisionError"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("reasonPlaceholder")}
        rows={2}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => decide("APPROVED")}
          disabled={submitting || !csrfToken || reason.trim().length < 3}
          className="rounded-md bg-green-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("approve")}
        </button>
        <button
          type="button"
          onClick={() => decide("REJECTED")}
          disabled={submitting || !csrfToken || reason.trim().length < 3}
          className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("reject")}
        </button>
      </div>
    </div>
  );
}
