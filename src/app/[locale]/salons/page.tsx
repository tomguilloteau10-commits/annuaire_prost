import { getTranslations, setRequestLocale } from "next-intl/server";
import { DEMO_SALONS } from "@/modules/showcase/demo-salons";
import { SalonCard } from "@/components/public/SalonCard";
import { listPublishedProfilesBySalon } from "@/modules/profiles/profile.service";
import { Reveal } from "@/components/ui/Reveal";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

// Lit les profils rattachés : rendu à chaque requête, jamais figé au build.
export const dynamic = "force-dynamic";

export default async function SalonsPage({ params }: { params: Promise<{ locale: string }> }) {
  if (!FEATURES.salons) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("salons");
  const profilesBySalon = await listPublishedProfilesBySalon();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">{t("title")}</h1>
        <p className="max-w-xl text-sm text-ink2-muted">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_SALONS.map((salon, index) => (
          <Reveal key={salon.slug} delay={(index % 3) * 70}>
            <SalonCard salon={salon} profiles={profilesBySalon[salon.slug] ?? []} />
          </Reveal>
        ))}
      </div>

      <p className="text-center text-xs text-ink2-faint">{t("demoNote")}</p>
    </main>
  );
}
