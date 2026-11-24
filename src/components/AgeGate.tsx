"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { AGE_COOKIE_MAX_AGE_SECONDS, AGE_COOKIE_NAME, AGE_GATE_SEGMENT } from "@/lib/age-gate";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = { fr: "FR", en: "EN", de: "DE", it: "IT" };

/**
 * Écran de confirmation 18+ (plein écran). Servi par le proxy à la place de
 * la page demandée ; après confirmation, la même adresse est rechargée et
 * affiche cette fois la vraie page.
 */
export function AgeGate({ locale }: { locale: string }) {
  const t = useTranslations("ageGate");
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Tout ce qui est derrière l'écran (menu, pied de page) devient inactif :
  // ni clic, ni tabulation, ni lecture par les lecteurs d'écran.
  useEffect(() => {
    const disabled: Element[] = [];
    let node: Element | null = dialogRef.current;
    while (node && node.parentElement && node !== document.body) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling !== node && !sibling.hasAttribute("inert") && sibling.tagName !== "SCRIPT") {
          sibling.setAttribute("inert", "");
          disabled.push(sibling);
        }
      }
      node = node.parentElement;
    }
    return () => disabled.forEach((element) => element.removeAttribute("inert"));
  }, []);

  function enter() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AGE_COOKIE_NAME}=1; Max-Age=${AGE_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    // Rechargement complet (pas de navigation client) : le proxy doit voir
    // le nouveau cookie. Ouverte directement (/fr/age) : vers l'accueil ;
    // sinon, la page demandée au départ.
    if (pathname === `/${AGE_GATE_SEGMENT}`)
      window.location.assign(new URL(`/${locale}`, window.location.origin).href);
    else window.location.reload();
  }

  return (
    <div
      ref={dialogRef}
      data-age-gate=""
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink"
      style={{
        backgroundImage:
          "radial-gradient(60% 50% at 50% 0%, rgba(217,183,126,0.10), transparent 70%), radial-gradient(50% 40% at 80% 100%, rgba(226,163,188,0.08), transparent 70%)",
      }}
    >
      <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        <nav aria-label={t("languages")} className="flex gap-3 text-xs">
          {routing.locales.map((code) => (
            <Link
              key={code}
              href={pathname}
              locale={code}
              className={code === locale ? "font-semibold text-ink2" : "text-ink2-faint hover:text-ink2"}
            >
              {LOCALE_LABELS[code]}
            </Link>
          ))}
        </nav>

        <p className="font-serif text-3xl leading-none tracking-tight">
          <span className="font-medium text-ink2">Velvet</span>
          <span className="text-gold font-semibold italic">Girl</span>
        </p>

        <div className="flex flex-col items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 font-serif text-lg text-accent">
            18+
          </span>
          <h1 id="age-gate-title" className="font-serif text-2xl font-medium text-ink2 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-ink2-muted">{t("body")}</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={enter}
            autoFocus
            className="rounded-full bg-gold-sheen px-7 py-3 text-sm font-semibold text-accent-foreground shadow-gold-btn transition-transform hover:-translate-y-0.5"
          >
            {t("enter")}
          </button>
          <a
            href="https://www.google.ch"
            rel="noreferrer"
            className="rounded-full border border-hairline2 px-7 py-3 text-sm font-medium text-ink2-muted transition-colors hover:text-ink2"
          >
            {t("leave")}
          </a>
        </div>

        <p className="max-w-sm text-xs leading-relaxed text-ink2-faint">
          {t.rich("notice", {
            terms: (chunks) => (
              <Link href="/legal/terms" className="text-ink2-muted underline underline-offset-4 hover:text-ink2">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/legal/privacy" className="text-ink2-muted underline underline-offset-4 hover:text-ink2">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
