"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";

/**
 * « Supprimer mon compte » : replié par défaut, en bas du tableau de bord.
 * Demande le mot de passe et une confirmation explicite.
 */
export function DeleteAccountCard() {
  const t = useTranslations("dashboard.deleteAccount");
  const auth = useTranslations("auth");
  const locale = useLocale();
  const csrfToken = useCsrfToken();
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || !understood) return;
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/provider/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ password, confirm: true }),
    }).catch(() => null);
    if (response?.ok) {
      // Rechargement complet : plus aucune donnée du compte en mémoire.
      window.location.assign(new URL(`/${locale}/account-deleted`, window.location.origin).href);
      return;
    }
    setSubmitting(false);
    setError(
      !response
        ? auth("networkError")
        : response.status === 401
          ? t("wrongPassword")
          : response.status === 429
            ? auth("tooManyAttempts")
            : t("error"),
    );
  }

  return (
    <details className="group rounded-xl2 border border-hairline bg-surface/40 p-5 sm:p-6">
      <summary className="cursor-pointer list-none text-sm font-medium text-ink2-muted transition-colors hover:text-danger">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="transition-transform group-open:rotate-90">
            ›
          </span>
          {t("title")}
        </span>
      </summary>
      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-ink2-muted">{t("explanation")}</p>
        <FieldGroup>
          <Label htmlFor="delete-password">{t("passwordLabel")}</Label>
          <TextInput
            id="delete-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldGroup>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink2-muted">
          <input
            type="checkbox"
            name="understood"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#E59393]"
          />
          <span>{t("confirmLabel")}</span>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="danger" disabled={submitting || !csrfToken || !understood || !password}>
          {submitting ? t("deleting") : t("submit")}
        </Button>
      </form>
    </details>
  );
}
