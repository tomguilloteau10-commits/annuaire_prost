"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";
import { ONBOARDING_PATH } from "@/lib/spaces";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [consentSensitiveData, setConsentSensitiveData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ email, password, acceptTerms, consentSensitiveData }),
    }).catch(() => null);

    if (!response?.ok) {
      setSubmitting(false);
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(
        !response
          ? t("networkError")
          : response.status === 429
            ? t("tooManyAttempts")
            : body?.error === "email_taken"
              ? t("emailTakenError")
              : body?.error === "consent_required"
                ? t("consentRequired")
                : t("registerError"),
      );
      return;
    }

    router.push(ONBOARDING_PATH);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <FieldGroup>
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <TextInput
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <TextInput
          id="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-ink2-faint">{t("passwordHint")}</p>
      </FieldGroup>
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-raised/40 p-4">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink2-muted">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#D9B77E]"
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link
                  href="/legal/terms"
                  target="_blank"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink2-muted">
          <input
            type="checkbox"
            name="consentSensitiveData"
            required
            checked={consentSensitiveData}
            onChange={(e) => setConsentSensitiveData(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#D9B77E]"
          />
          <span>{t("consentSensitiveData")}</span>
        </label>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting || !csrfToken || !acceptTerms || !consentSensitiveData}>
        {t("submit")}
      </Button>
    </form>
  );
}
