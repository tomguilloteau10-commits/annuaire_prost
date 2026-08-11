import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { redirect } from "@/i18n/navigation";
import { AttestationForm } from "@/components/provider/AttestationForm";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  if (await hasCompletedOnboardingAttestation(user.id)) {
    redirect({ href: "/provider/verification", locale });
  }

  const t = await getTranslations("onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="max-w-xl text-center text-sm text-gray-600">{t("intro")}</p>
      <AttestationForm />
    </main>
  );
}
