"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export function SubmitProfileButton() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/provider/profile/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    });

    if (!response.ok) {
      setSubmitting(false);
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(
        body?.error === "onboarding_incomplete"
          ? t("submitErrorOnboarding")
          : body?.error === "verification_incomplete"
            ? t("submitErrorVerification")
            : t("submitErrorGeneric"),
      );
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !csrfToken}
        className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-50"
      >
        {t("submitForReview")}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
