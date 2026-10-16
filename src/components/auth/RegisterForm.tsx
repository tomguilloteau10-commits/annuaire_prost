"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setSubmitting(false);
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "email_taken" ? t("emailTakenError") : t("registerError"));
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting || !csrfToken}>
        {t("submit")}
      </Button>
    </form>
  );
}
