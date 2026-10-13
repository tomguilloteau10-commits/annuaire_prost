"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";

/**
 * Interrupteur "Disponible maintenant" : toute la carte est cliquable
 * (grande cible au doigt), l'état change tout de suite à l'écran et revient
 * en arrière si l'enregistrement échoue.
 */
export function AvailabilityToggle({
  initialAvailable,
  disabled = false,
}: {
  initialAvailable: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("dashboard.availability");
  const csrfToken = useCsrfToken();
  const [available, setAvailable] = useState(initialAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (!csrfToken || saving || disabled) return;
    const next = !available;
    setAvailable(next);
    setSaving(true);
    setError(false);

    const response = await fetch("/api/provider/profile/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ available: next }),
    });

    setSaving(false);
    if (!response.ok) {
      setAvailable(!next);
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={available}
        onClick={toggle}
        disabled={disabled || !csrfToken}
        className="flex w-full items-center justify-between gap-4 rounded-xl2 border border-hairline bg-surface p-5 text-left shadow-card transition-colors hover:border-hairline2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex flex-col gap-1">
          <span className="font-serif text-lg font-medium text-ink2">{t("title")}</span>
          <span className={`text-sm ${available ? "text-success" : "text-ink2-muted"}`}>
            {disabled ? t("needsProfile") : available ? t("on") : t("off")}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
            available ? "bg-success" : "bg-surface-hover"
          }`}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-ink2 shadow transition-transform ${
              available ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </span>
      </button>
      {error && <p className="text-sm text-danger">{t("error")}</p>}
    </div>
  );
}
