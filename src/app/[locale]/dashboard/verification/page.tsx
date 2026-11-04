import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link, redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getLatestVerification } from "@/modules/verification/manual-review.service";
import { ResubmitDocumentsForm } from "@/components/provider/ResubmitDocumentsForm";
import { Card } from "@/components/ui/Card";
import { DASHBOARD_PATH, ONBOARDING_PATH, PROFILE_EDIT_PATH } from "@/lib/spaces";

const TONE = {
  ok: "border-success/40 bg-success-soft",
  wait: "border-warning/40 bg-warning-soft",
  action: "border-danger/40 bg-danger-soft",
} as const;

/**
 * "Ma vérification" : où en est le contrôle de la pièce d'identité et du
 * permis, motif en cas de refus, nouveau dépôt possible. La prestataire ne
 * peut rien valider elle-même : seul l'admin décide.
 */
export default async function VerificationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);

  const attestation = await prisma.onboardingAttestation.findUnique({ where: { providerId: user.id } });
  if (!attestation) redirect({ href: ONBOARDING_PATH, locale });

  const t = await getTranslations("verification");
  const [verification, hasProfile] = await Promise.all([
    getLatestVerification(user.id),
    prisma.providerProfile.count({ where: { userId: user.id } }).then((n) => n > 0),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  const identity =
    verification?.status === "VERIFIED"
      ? ({ tone: "ok", key: "verified" } as const)
      : verification?.status === "PENDING" || verification?.status === "IN_PROGRESS"
        ? ({ tone: "wait", key: "pending" } as const)
        : verification?.status === "FAILED"
          ? ({ tone: "action", key: "rejected" } as const)
          : ({ tone: "action", key: "missing" } as const);
  const permitStatus = attestation!.workPermitStatus;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <Link href={DASHBOARD_PATH} className="self-start text-sm text-ink2-muted transition-colors hover:text-ink2">
          ← {t("backToDashboard")}
        </Link>
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
      </div>

      <section className={`flex flex-col gap-3 rounded-xl2 border p-5 ${TONE[identity.tone]}`}>
        <h2 className="font-serif text-xl font-medium text-ink2">{t(`identity.${identity.key}.title`)}</h2>
        <p className="text-ink2">
          {identity.key === "verified" && verification?.verifiedAt
            ? t("identity.verified.body", { date: dateFormatter.format(verification.verifiedAt) })
            : t(`identity.${identity.key}.body`)}
        </p>
        {identity.key === "rejected" && verification?.rejectionReason && (
          <p className="rounded-xl bg-ink/40 px-3.5 py-2.5 text-sm text-ink2">
            {t("reason")} : « {verification.rejectionReason} »
          </p>
        )}
        {(identity.key === "rejected" || identity.key === "missing") && <ResubmitDocumentsForm kind="identity" />}
        {identity.key !== "rejected" && identity.key !== "missing" && (
          <Link
            href={hasProfile ? DASHBOARD_PATH : PROFILE_EDIT_PATH}
            className="self-start rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            {hasProfile ? t("toDashboard") : t("continueToProfile")}
          </Link>
        )}
      </section>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-serif text-lg font-medium text-ink2">{t("permit.title")}</h2>
        <p className="text-sm text-ink2-muted">{t(`permit.${permitStatus}`)}</p>
        {permitStatus === "REJECTED" && attestation!.workPermitRejectionReason && (
          <p className="text-sm text-ink2">
            {t("reason")} : « {attestation!.workPermitRejectionReason} »
          </p>
        )}
        {(permitStatus === "NONE" || permitStatus === "REJECTED") && <ResubmitDocumentsForm kind="workPermit" />}
      </Card>

      <p className="text-xs text-ink2-faint">🔒 {t("privacy")}</p>
    </main>
  );
}
