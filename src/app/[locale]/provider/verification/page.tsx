import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { redirect } from "@/i18n/navigation";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { VerificationStart } from "@/components/provider/VerificationStart";

export default async function VerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  if (!(await hasCompletedOnboardingAttestation(user.id))) {
    redirect({ href: "/provider/onboarding", locale });
  }

  const t = await getTranslations("verification");
  const verified = await hasPassedAdultVerification(user.id);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="max-w-xl text-center text-sm text-gray-600">{t("intro")}</p>
      {verified ? (
        <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-800">{t("alreadyVerified")}</p>
      ) : (
        <VerificationStart />
      )}
    </main>
  );
}
