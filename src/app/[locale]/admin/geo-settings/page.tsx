import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { GeoSettingsForm } from "@/components/admin/GeoSettingsForm";

export default async function AdminGeoSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminGeoSettings");

  const countries = await prisma.allowedCountry.findMany({ orderBy: { countryCode: "asc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      <GeoSettingsForm countries={countries} />
    </main>
  );
}
