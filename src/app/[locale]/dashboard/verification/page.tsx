import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link, redirect } from "@/i18n/navigation";
import { hasCompletedOnboardingAttestation } from "@/modules/onboarding/attestation.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { VerificationStart } from "@/components/provider/VerificationStart";
import { Badge } from "@/components/ui/Badge";
import { DASHBOARD_PATH, ONBOARDING_PATH, PROFILE_EDIT_PATH } from "@/lib/spaces";
import { prisma } from "@/lib/prisma";

export default async function VerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  if (!(await hasCompletedOnboardingAttestation(user.id))) {
    redirect({ href: ONBOARDING_PATH, locale });
  }

  const t = await getTranslations("verification");
  const [verified, hasProfile] = await Promise.all([
    hasPassedAdultVerification(user.id),
    prisma.providerProfile.count({ where: { userId: user.id } }).then((n) => n > 0),
  ]);
  // Une fois vérifiée, la prestataire enchaîne directement sur le formulaire
  // de profil s'il n'existe pas encore, sinon retour au tableau de bord.
  const nextHref = hasProfile ? DASHBOARD_PATH : PROFILE_EDIT_PATH;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-6 px-4 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      <p className="max-w-xl text-center text-sm text-ink2-muted">{t("intro")}</p>
      {verified ? (
        <div className="flex flex-col items-center gap-4">
          <Badge variant="success">{t("alreadyVerified")}</Badge>
          <Link
            href={nextHref}
            className="rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            {t("continue")}
          </Link>
        </div>
      ) : (
        <VerificationStart nextHref={nextHref} />
      )}
    </main>
  );
}
