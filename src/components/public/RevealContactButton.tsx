"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
      <Card className="flex flex-col gap-1 p-4 text-sm text-ink2">
        {contact.phone && <span>{contact.phone}</span>}
        {contact.email && <span>{contact.email}</span>}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleReveal} disabled={loading || !csrfToken} className="w-full sm:w-auto">
        {t("revealContact")}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
