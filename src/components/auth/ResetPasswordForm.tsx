"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";

// Le jeton est dans la partie « #token=… » du lien : jamais envoyée au
// serveur avec la page, lue ici seulement.
function readTokenFromHash(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}
const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const token = useSyncExternalStore(subscribe, readTokenFromHash, () => null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token === null) return null; // rendu serveur : le jeton n'est connu que dans le navigateur
  if (!token) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4 text-center">
        <p className="text-sm text-danger">{t("resetInvalidLink")}</p>
        <Link href="/forgot-password" className="text-sm text-accent underline-offset-4 hover:underline">
          {t("resetAskNewLink")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    if (password !== confirmation) return setError(t("resetMismatch"));
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    if (response?.ok) {
      // Le jeton ne reste pas dans l'historique du navigateur.
      window.history.replaceState(null, "", window.location.pathname);
      router.push("/login?reset=1");
      return;
    }
    setSubmitting(false);
    const body = (await response?.json().catch(() => null)) as { error?: string } | null;
    setError(
      !response
        ? t("networkError")
        : response.status === 429
          ? t("tooManyAttempts")
          : body?.error === "invalid_token"
            ? t("resetInvalidLink")
            : t("resetError"),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <FieldGroup>
        <Label htmlFor="password">{t("resetNewPassword")}</Label>
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
      <FieldGroup>
        <Label htmlFor="confirmation">{t("resetConfirmPassword")}</Label>
        <TextInput
          id="confirmation"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </FieldGroup>
      {error && (
        <p className="text-sm text-danger">
          {error}{" "}
          {error === t("resetInvalidLink") && (
            <Link href="/forgot-password" className="underline underline-offset-4">
              {t("resetAskNewLink")}
            </Link>
          )}
        </p>
      )}
      <Button type="submit" disabled={submitting || !csrfToken}>
        {t("resetSubmit")}
      </Button>
    </form>
  );
}
