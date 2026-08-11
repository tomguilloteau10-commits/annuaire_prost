"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

const FIELDS = [
  "attestedAdult",
  "attestedVoluntary",
  "attestedAuthorizedToWorkInSwitzerland",
  "attestedCantonalDeclaration",
] as const;

type FieldKey = (typeof FIELDS)[number];

export function AttestationForm() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [checked, setChecked] = useState<Record<FieldKey, boolean>>({
    attestedAdult: false,
    attestedVoluntary: false,
    attestedAuthorizedToWorkInSwitzerland: false,
    attestedCantonalDeclaration: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allChecked = FIELDS.every((field) => checked[field]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || !allChecked) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/onboarding/attestation", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(checked),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(t("submitError"));
      return;
    }

    router.push("/provider/verification");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-4">
      {FIELDS.map((field) => (
        <label key={field} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 text-sm">
          <input
            type="checkbox"
            checked={checked[field]}
            onChange={(e) => setChecked((prev) => ({ ...prev, [field]: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>{t(`fields.${field}`)}</span>
        </label>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!allChecked || submitting || !csrfToken}
        className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
