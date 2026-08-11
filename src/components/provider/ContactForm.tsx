"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";

export interface ContactFormProps {
  initialPhone: string;
  initialEmail: string;
}

// Formulaire distinct de ProfileEditForm à dessein : le contact vit dans
// sa propre table côté serveur (ProfileContact) et sa propre route
// (/api/provider/profile/contact) — jamais mélangé au reste du profil,
// cohérent avec ENGINEERING_RULES.md §5.
export function ContactForm({ initialPhone, initialEmail }: ContactFormProps) {
  const t = useTranslations("profileEdit");
  const csrfToken = useCsrfToken();
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/provider/profile/contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ phone: phone || undefined, email: email || undefined }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="text-base font-medium">{t("contactTitle")}</h2>
      <p className="text-xs text-gray-500">{t("contactHint")}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          {t("phoneLabel")}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="contactEmail" className="text-sm font-medium text-gray-700">
          {t("contactEmailLabel")}
        </label>
        <input
          id="contactEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">{t("saved")}</p>}
      <button
        type="submit"
        disabled={submitting || !csrfToken}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {t("save")}
      </button>
    </form>
  );
}
