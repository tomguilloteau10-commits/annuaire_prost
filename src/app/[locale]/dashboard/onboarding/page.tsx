import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { redirect } from "@/i18n/navigation";
import { AttestationForm } from "@/components/provider/AttestationForm";
import { VERIFICATION_PATH } from "@/lib/spaces";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  if (await hasCompletedOnboardingAttestation(user.id)) {
    redirect({ href: VERIFICATION_PATH, locale });
  }

  const t = await getTranslations("onboarding");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 px-4 py-10 sm:py-14">
      <div className="flex w-full max-w-xl flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <p className="text-sm text-ink2-muted">{t("intro")}</p>
      </div>
      <AttestationForm />
    </main>
  );
}
