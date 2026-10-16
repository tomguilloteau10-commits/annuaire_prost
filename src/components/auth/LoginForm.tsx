"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";
import { homeForRole } from "@/lib/spaces";
import type { Role } from "@/modules/auth/rbac";

export function LoginForm() {
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

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError(t("loginError"));
      return;
    }

    // Chacun arrive dans son espace : prestataire → /dashboard, admin → /admin.
    const data = (await response.json()) as { role: Role };
    router.push(homeForRole(data.role));
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FieldGroup>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={submitting || !csrfToken}>
        {t("submit")}
      </Button>
    </form>
  );
}
