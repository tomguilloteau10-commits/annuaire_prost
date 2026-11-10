import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Page introuvable (profil retiré, lien erroné…). */
export default async function NotFound() {
  const t = await getTranslations("notFoundPage");
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      <p className="text-ink2-muted">{t("body")}</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        {t("home")}
      </Link>
    </main>
  );
}
