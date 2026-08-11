import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link } from "@/i18n/navigation";
import { getProviderDashboardData } from "@/modules/profiles/profile.service";
import { SubmitProfileButton } from "@/components/provider/SubmitProfileButton";

export default async function ProviderDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);
  const t = await getTranslations("dashboard");

  const { profile, verification, attestationCompleted } = await getProviderDashboardData(user.id);

  const canSubmit =
    !!profile &&
    (profile.status === "DRAFT" || profile.status === "REJECTED") &&
    attestationCompleted &&
    verification?.status === "VERIFIED";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <dl className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">{t("attestationLabel")}</dt>
          <dd className="font-medium">{attestationCompleted ? t("done") : t("todo")}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">{t("verificationLabel")}</dt>
          <dd className="font-medium">{t(`verificationStatus.${verification?.status ?? "NONE"}`)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">{t("profileStatusLabel")}</dt>
          <dd className="font-medium">{t(`profileStatus.${profile?.status ?? "NONE"}`)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">{t("publiclyVisibleLabel")}</dt>
          <dd className="font-medium">
            {profile?.status === "PUBLISHED" ? t("yes") : t("no")}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        {!attestationCompleted && (
          <Link href="/provider/onboarding" className="text-brand underline">
            {t("goToOnboarding")}
          </Link>
        )}
        {attestationCompleted && verification?.status !== "VERIFIED" && (
          <Link href="/provider/verification" className="text-brand underline">
            {t("goToVerification")}
          </Link>
        )}
        <Link href="/provider/profile/edit" className="text-brand underline">
          {profile ? t("editProfile") : t("createProfile")}
        </Link>
        {canSubmit && <SubmitProfileButton />}
      </div>
    </main>
  );
}
