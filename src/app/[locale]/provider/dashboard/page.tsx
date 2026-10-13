import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link } from "@/i18n/navigation";
import { getProviderDashboardData } from "@/modules/profiles/profile.service";
import { SubmitProfileButton } from "@/components/provider/SubmitProfileButton";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

function verificationVariant(status: string | undefined): BadgeVariant {
  if (status === "VERIFIED") return "success";
  if (status === "FAILED" || status === "EXPIRED") return "danger";
  if (status === "PENDING" || status === "IN_PROGRESS") return "warning";
  return "neutral";
}

function profileStatusVariant(status: string | undefined): BadgeVariant {
  if (status === "PUBLISHED") return "success";
  if (status === "PENDING_REVIEW") return "warning";
  if (status === "REJECTED" || status === "SUSPENDED") return "danger";
  return "neutral";
}

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>

      <Card className="flex flex-col divide-y divide-hairline p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-ink2-muted">{t("attestationLabel")}</span>
          <Badge variant={attestationCompleted ? "success" : "warning"}>
            {attestationCompleted ? t("done") : t("todo")}
          </Badge>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-ink2-muted">{t("verificationLabel")}</span>
          <Badge variant={verificationVariant(verification?.status)}>
            {t(`verificationStatus.${verification?.status ?? "NONE"}`)}
          </Badge>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-ink2-muted">{t("profileStatusLabel")}</span>
          <Badge variant={profileStatusVariant(profile?.status)}>
            {t(`profileStatus.${profile?.status ?? "NONE"}`)}
          </Badge>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-ink2-muted">{t("publiclyVisibleLabel")}</span>
          <Badge variant={profile?.status === "PUBLISHED" ? "success" : "neutral"}>
            {profile?.status === "PUBLISHED" ? t("yes") : t("no")}
          </Badge>
        </div>
      </Card>

      <div className="flex flex-col items-start gap-3">
        {!attestationCompleted && (
          <Link href="/provider/onboarding" className="text-accent transition-colors hover:text-accent-hover">
            {t("goToOnboarding")} →
          </Link>
        )}
        {attestationCompleted && verification?.status !== "VERIFIED" && (
          <Link href="/provider/verification" className="text-accent transition-colors hover:text-accent-hover">
            {t("goToVerification")} →
          </Link>
        )}
        <Link
          href="/provider/profile/edit"
          className="text-accent transition-colors hover:text-accent-hover"
        >
          {profile ? t("editProfile") : t("createProfile")} →
        </Link>
        {canSubmit && <SubmitProfileButton />}
      </div>
    </main>
  );
}
