"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";

function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/[^0-9]/g, "")}`;
}

/**
 * CTA principale de la page profil. Même contrainte que RevealContactButton
 * (ENGINEERING_RULES.md §5) : le numéro n'est jamais dans le HTML initial,
 * seulement récupéré au clic via /api/profiles/[slug]/contact (anonyme,
 * rate-limité, aucun compte requis) puis ouvert directement dans un nouvel
 * onglet — aucun tiers de tracking, aucun identifiant client ajouté à l'URL.
 */
export function WhatsAppButton({ slug }: { slug: string }) {
  const t = useTranslations("profile");
  const csrfToken = useCsrfToken();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
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
    const contact = (await response.json()) as { whatsapp: string | null };
    if (!contact.whatsapp) {
      setError(t("noWhatsapp"));
      return;
    }
    window.open(whatsappHref(contact.whatsapp), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={loading || !csrfToken} className="w-full py-3.5 text-base">
        {t("contactWhatsapp")}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
