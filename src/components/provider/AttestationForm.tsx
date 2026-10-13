"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-3">
      {FIELDS.map((field) => (
        <Card
          key={field}
          as="label"
          className="flex cursor-pointer items-start gap-3 p-4 text-sm text-ink2-muted transition-colors hover:border-hairline2"
        >
          <input
            type="checkbox"
            checked={checked[field]}
            onChange={(e) => setChecked((prev) => ({ ...prev, [field]: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline2 bg-surface-raised text-accent accent-accent"
          />
          <span>{t(`fields.${field}`)}</span>
        </Card>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={!allChecked || submitting || !csrfToken}>
        {t("submit")}
      </Button>
    </form>
  );
}
