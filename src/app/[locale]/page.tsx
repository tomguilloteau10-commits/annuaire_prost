import { getTranslations, setRequestLocale } from "next-intl/server";

// Page d'accueil — squelette pour la bêta (ossature). La liste des profils
// publiés, les filtres et la page profil publique arrivent à l'étape
// "parcours" (voir docs/ARCHITECTURE.md).
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const common = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-400">{common("betaNotice")}</p>
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
      <p className="text-base text-gray-600">{t("subtitle")}</p>
      <p className="mt-8 text-sm text-gray-400">{t("emptyState")}</p>
    </main>
  );
}
