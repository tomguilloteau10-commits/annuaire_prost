"use client";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface RevealedContact {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
}

function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/[^0-9]/g, "")}`;
}

function instagramHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

function telHref(value: string): string {
  return `tel:${value.replace(/[^0-9+]/g, "")}`;
}

const ICON_CLASSES = "h-4 w-4 shrink-0";

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" aria-hidden>
      <path
        d="M10 3a7 7 0 0 0-6.06 10.5L3 17l3.6-.92A7 7 0 1 0 10 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={ICON_CLASSES} aria-hidden>
      <rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={ICON_CLASSES} aria-hidden>
      <path
        d="M4 3.5h3l1.5 3.5-2 1.5a9 9 0 0 0 5 5l1.5-2 3.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5A13.5 13.5 0 0 1 2.5 5 1.5 1.5 0 0 1 4 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={ICON_CLASSES} aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m3 5.5 7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function SecondaryLink({ href, external, icon, children }: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="inline-flex min-w-0 items-center gap-2.5 rounded-full border border-hairline2 bg-surface-raised px-4 py-2.5 text-sm text-ink2 transition-colors hover:bg-surface-hover"
    >
      {icon}
      <span className="truncate">{children}</span>
    </a>
  );
}

/**
 * Bloc contact de la page profil. Le contact n'est jamais dans le HTML
 * initial ni dans une réponse publique (ENGINEERING_RULES.md §5) : il n'est
 * récupéré qu'au clic sur "Afficher le contact", via
 * /api/profiles/[slug]/contact (anonyme, rate-limité). Aucun compte requis,
 * aucun traceur : les liens ouvrent directement wa.me / Instagram / tel: /
 * mailto:, sans paramètre ajouté, avec rel="noreferrer".
 */
export function ContactBlock({ slug }: { slug: string }) {
  const t = useTranslations("profile");
  const csrfToken = useCsrfToken();
  const [contact, setContact] = useState<RevealedContact | null>(null);
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

  const hasSecondary = contact && (contact.instagram || contact.phone || contact.email);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg font-medium text-ink2">{t("contactTitle")}</h2>
        <p className="text-sm text-ink2-muted">{t("contactIntro")}</p>
      </div>

      {!contact ? (
        <Button onClick={handleReveal} disabled={loading || !csrfToken} className="w-full py-3 text-base">
          {t("showContact")}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          {contact.whatsapp ? (
            <a
              href={whatsappHref(contact.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-success px-4 py-3.5 text-base font-medium text-[#102017] transition-colors hover:bg-success/85"
            >
              <ChatIcon />
              {t("contactWhatsapp")}
            </a>
          ) : (
            <p className="text-sm text-ink2-muted">{t("noWhatsapp")}</p>
          )}

          {hasSecondary && (
            <div className="flex flex-col gap-2">
              {contact.instagram && (
                <SecondaryLink href={instagramHref(contact.instagram)} external icon={<CameraIcon />}>
                  Instagram · {contact.instagram}
                </SecondaryLink>
              )}
              {contact.phone && (
                <SecondaryLink href={telHref(contact.phone)} icon={<PhoneIcon />}>
                  {contact.phone}
                </SecondaryLink>
              )}
              {contact.email && (
                <SecondaryLink href={`mailto:${contact.email}`} icon={<MailIcon />}>
                  {contact.email}
                </SecondaryLink>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
