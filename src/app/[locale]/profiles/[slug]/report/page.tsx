import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { ReportForm } from "@/components/public/ReportForm";
import { Card } from "@/components/ui/Card";

export default async function ReportProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("report");

  const profile = await getPublishedProfileBySlug(slug);
  if (!profile) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title", { name: profile.displayName })}</h1>
        <p className="text-sm text-ink2-muted">{t("intro")}</p>
      </div>
      <Card className="p-5 sm:p-6">
        <ReportForm slug={profile.slug} />
      </Card>
    </main>
  );
}
