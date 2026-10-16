import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { redirect } from "@/i18n/navigation";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { VerificationStart } from "@/components/provider/VerificationStart";
import { Badge } from "@/components/ui/Badge";
import { ONBOARDING_PATH } from "@/lib/spaces";

export default async function VerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  if (!(await hasCompletedOnboardingAttestation(user.id))) {
    redirect({ href: ONBOARDING_PATH, locale });
  }

  const t = await getTranslations("verification");
  const verified = await hasPassedAdultVerification(user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 px-4 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      <p className="max-w-xl text-center text-sm text-ink2-muted">{t("intro")}</p>
      {verified ? <Badge variant="success">{t("alreadyVerified")}</Badge> : <VerificationStart />}
    </main>
  );
}
