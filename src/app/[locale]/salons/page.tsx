import { getTranslations, setRequestLocale } from "next-intl/server";
import { DEMO_SALONS } from "@/modules/showcase/demo-salons";
import { SalonCard } from "@/components/public/SalonCard";

export default async function SalonsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("salons");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">{t("title")}</h1>
        <p className="max-w-xl text-sm text-ink2-muted">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_SALONS.map((salon) => (
          <SalonCard key={salon.slug} salon={salon} />
        ))}
      </div>

      <p className="text-center text-xs text-ink2-faint">{t("demoNote")}</p>
    </main>
  );
}
