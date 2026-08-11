"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";

/**
 * Le contact n'est jamais dans le HTML initial ni dans une réponse de
 * liste (ENGINEERING_RULES.md §5) : ce composant l'obtient uniquement à la
 * demande, via /api/profiles/[slug]/contact, au clic.
 */
export function RevealContactButton({ slug }: { slug: string }) {
  const t = useTranslations("profile");
  const csrfToken = useCsrfToken();
  const [contact, setContact] = useState<{ phone: string | null; email: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReveal() {
    if (!csrfToken) return;
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/profiles/${slug}/contact`, {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    });

    setLoading(false);
    if (!response.ok) {
      setError(response.status === 429 ? t("contactRateLimited") : t("contactError"));
      return;
    }
    setContact(await response.json());
  }

  if (contact) {
    return (
      <div className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 text-sm">
        {contact.phone && <span>{contact.phone}</span>}
        {contact.email && <span>{contact.email}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleReveal}
        disabled={loading || !csrfToken}
        className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-50"
      >
        {t("revealContact")}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
