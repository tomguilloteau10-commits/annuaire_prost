import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AccountDeletedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard.deleteAccount");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("doneTitle")}</h1>
      <p className="text-sm leading-relaxed text-ink2-muted">{t("doneBody")}</p>
      <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
        {t("doneBack")}
      </Link>
    </main>
  );
}
