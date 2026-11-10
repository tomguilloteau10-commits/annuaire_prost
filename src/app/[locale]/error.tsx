"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Erreur inattendue pendant l'affichage d'une page : message simple, sans
 * détail technique (rien du message d'erreur n'est montré), et un bouton
 * pour réessayer. Le détail reste dans les logs serveur.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      <p className="text-ink2-muted">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          {t("retry")}
        </button>
        <Link href="/" className="rounded-full border border-hairline2 px-6 py-3 text-ink2 transition-colors hover:bg-surface-hover">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
