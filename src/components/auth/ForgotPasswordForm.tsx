"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const csrfToken = useCsrfToken();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ email, locale }),
    }).catch(() => null);
    setSubmitting(false);
    if (!response) return setError(t("networkError"));
    if (response.status === 429) return setError(t("tooManyAttempts"));
    if (!response.ok) return setError(t("forgotError"));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm leading-relaxed text-success">
          {t("forgotSent")}
        </p>
        <Link href="/login" className="text-sm text-accent underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink2-muted">{t("forgotIntro")}</p>
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting || !csrfToken}>
        {t("forgotSubmit")}
      </Button>
      <Link href="/login" className="text-center text-sm text-ink2-muted hover:text-ink2">
        {t("backToLogin")}
      </Link>
    </form>
  );
}
