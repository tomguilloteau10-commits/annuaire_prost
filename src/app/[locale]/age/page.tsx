import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgeGate } from "@/components/AgeGate";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ageGate" });
  return { title: t("title") };
}

/**
 * Page de confirmation 18+. Le proxy la sert à la place de toute page tant
 * que l'âge n'est pas confirmé (voir src/lib/age-gate.ts).
 */
export default async function AgePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AgeGate locale={locale} />;
}
