import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getProviderDashboardData, getProviderDashboardExtras } from "@/modules/profiles/profile.service";
import { computeProviderDashboardState, type StatusTone } from "@/modules/profiles/provider-dashboard";
import { getPlanFeatures, getProviderEntitlements } from "@/modules/entitlements/entitlements.service";
import { ProfileCard } from "@/components/public/ProfileCard";
import { SubmitProfileButton } from "@/components/provider/SubmitProfileButton";
import { AvailabilityToggle } from "@/components/provider/AvailabilityToggle";
import { Card } from "@/components/ui/Card";
import { SubscriptionCard } from "@/components/provider/SubscriptionCard";
import { getSubscriptionView } from "@/modules/subscriptions/subscription.service";
import { PROFILE_EDIT_PATH, VERIFICATION_PATH } from "@/lib/spaces";

const TONE_CLASSES: Record<StatusTone, { box: string; dot: string; title: string }> = {
  online: { box: "border-success/40 bg-success-soft", dot: "bg-success", title: "text-success" },
  pending: { box: "border-warning/40 bg-warning-soft", dot: "bg-warning", title: "text-warning" },
  action: { box: "border-danger/40 bg-danger-soft", dot: "bg-danger", title: "text-danger" },
};

const BIG_BUTTON =
  "inline-flex w-full items-center justify-center rounded-full px-5 py-3.5 text-base font-medium transition-colors sm:w-auto";
const PRIMARY_BUTTON = `${BIG_BUTTON} bg-accent text-accent-foreground hover:bg-accent-hover`;
const SECONDARY_BUTTON = `${BIG_BUTTON} border border-hairline2 bg-surface-raised text-ink2 hover:bg-surface-hover`;

function CheckIcon({ done }: { done: boolean }) {
  if (!done) {
    return <span aria-hidden className="h-7 w-7 shrink-0 rounded-full border-2 border-hairline2" />;
  }
  return (
    <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-[#102017]">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="m5 10.5 3.2 3L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
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
  const extras = profile ? await getProviderDashboardExtras(profile.id) : { hasWhatsapp: false, rejectionReason: null };
  const plan = profile
    ? await getProviderEntitlements(profile.id)
    : await getPlanFeatures((await prisma.plan.findUniqueOrThrow({ where: { code: "founder" } })).id);

  // Abonnement (paiement hors plateforme) : statut déduit des dates.
  const subscription = profile ? await getSubscriptionView(profile.id) : null;
  const wasPaid = subscription?.wasPaid ?? false;
  const subscriptionNeedsAction = subscription?.status === "PAYMENT_DUE" || subscription?.status === "PAUSED";
  const isPublic = profile?.status === "PUBLISHED" && subscription?.listed === true;

  const visiblePhotos = profile?.media.filter((m) => m.status !== "REJECTED") ?? [];
  // L'aperçu montre exactement ce que voient les clients : uniquement les
  // photos validées (une photo en attente n'est pas encore publique).
  const publicPhoto = profile?.media.find((m) => m.status === "APPROVED");
  const pendingPhotoCount = profile?.media.filter((m) => m.status === "PENDING").length ?? 0;
  const state = computeProviderDashboardState({
    profileStatus: profile?.status ?? null,
    attestationCompleted,
    verificationStatus: verification?.status ?? null,
    photoCount: visiblePhotos.length,
    hasWhatsapp: extras.hasWhatsapp,
    subscriptionListed: subscription?.listed ?? true,
  });
  const tone = TONE_CLASSES[state.tone];
  const doneCount = state.checklist.filter((item) => item.done).length;

  const statusTitle =
    state.tone === "online" ? t("status.onlineTitle") : state.tone === "pending" ? t("status.pendingTitle") : t("status.actionTitle");
  const identityPending = state.checklist.some((item) => item.key === "ageVerification" && item.pending);
  const statusBody =
    state.reason === "incomplete"
      ? t("status.incomplete", { count: state.remainingCount })
      : state.reason === "rejected" && extras.rejectionReason
        ? t("status.rejectedWithReason", { reason: extras.rejectionReason })
        : state.reason === "pendingReview" && identityPending
          ? t("status.pendingIdentity")
          : state.reason === "readyToSubmit" && identityPending
            ? t("status.readyToSubmitIdentityPending")
            : t(`status.${state.reason}`);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {profile && <p className="text-ink2-muted">{t("greeting", { name: profile.displayName })}</p>}
          {state.identityVerified && (
            <span className="rounded-full border border-success/40 bg-success-soft px-3 py-1 text-sm font-medium text-success">
              ✓ {t("verifiedBadge")}
            </span>
          )}
        </div>
      </div>

      {/* 1. Statut : une seule information dominante + quoi faire. */}
      <section aria-live="polite" className={`flex flex-col gap-4 rounded-xl2 border p-5 sm:p-6 ${tone.box}`}>
        <div className="flex items-start gap-3">
          <span aria-hidden className={`mt-2 h-3 w-3 shrink-0 rounded-full ${tone.dot}`} />
          <div className="flex flex-col gap-1.5">
            <h2 className={`font-serif text-2xl font-medium ${tone.title}`}>{statusTitle}</h2>
            <p className="text-base text-ink2">{statusBody}</p>
          </div>
        </div>
        {state.reason === "identityRejected" && (
          <Link href={VERIFICATION_PATH} className={PRIMARY_BUTTON}>
            {t("status.resendDocuments")}
          </Link>
        )}
        {state.reason === "incomplete" && state.nextHref && (
          <Link href={state.nextHref} className={PRIMARY_BUTTON}>
            {t("status.continue")}
          </Link>
        )}
        {state.reason === "rejected" && (
          <Link href={PROFILE_EDIT_PATH} className={state.canSubmit ? SECONDARY_BUTTON : PRIMARY_BUTTON}>
            {t("status.fixProfile")}
          </Link>
        )}
        {state.canSubmit && (
          <SubmitProfileButton
            label={state.reason === "rejected" ? t("status.resubmit") : t("status.submit")}
            className="w-full sm:w-auto"
          />
        )}
      </section>

      {/* Abonnement à régler / en pause : juste sous le statut, impossible à manquer. */}
      {subscriptionNeedsAction && (
        <SubscriptionCard locale={locale} view={subscription} wasPaid={wasPaid} maxPhotos={plan.maxPhotos} />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 2. Aperçu du profil tel que les clients le voient. */}
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="font-serif text-lg font-medium text-ink2">{t("preview.title")}</h2>
          {profile ? (
            <>
              <div className="w-44 self-center sm:w-48">
                <ProfileCard
                  preview
                  locale={locale}
                  profile={{
                    slug: profile.slug,
                    displayName: profile.displayName,
                    age: profile.age,
                    onlineStatus: profile.onlineStatus,
                    city: profile.city,
                    category: profile.category,
                    thumbnailUrl: publicPhoto ? `/api/provider/profile/photos/${publicPhoto.id}/preview` : null,
                  }}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {isPublic ? (
                  <Link href={`/profiles/${profile.slug}`} className={`${SECONDARY_BUTTON} sm:w-full`}>
                    {t("preview.viewPublic")}
                  </Link>
                ) : (
                  <p className="text-center text-sm text-ink2-faint">{t("preview.notPublicYet")}</p>
                )}
                {pendingPhotoCount > 0 && (
                  <p className="rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-sm text-ink2">
                    {t("preview.pendingPhotos", { count: pendingPhotoCount })}
                  </p>
                )}
                <Link href={PROFILE_EDIT_PATH} className={`${PRIMARY_BUTTON} sm:w-full`}>
                  {t("preview.edit")}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-ink2-muted">{t("preview.noProfile")}</p>
              <Link href={`${PROFILE_EDIT_PATH}?step=presentation`} className={`${PRIMARY_BUTTON} sm:w-full`}>
                {t("preview.create")}
              </Link>
            </>
          )}
        </Card>

        {/* 3. Checklist "Pour être visible" : chaque case à faire mène à l'étape. */}
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-lg font-medium text-ink2">{t("checklist.title")}</h2>
            <p className="text-sm text-ink2-muted">{t("checklist.progress", { done: doneCount, total: state.checklist.length })}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {state.checklist.map((item) => (
              <li key={item.key}>
                {item.done ? (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <CheckIcon done />
                    <span className="text-ink2">{t(`checklist.items.${item.key}`)}</span>
                  </div>
                ) : item.pending ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft px-3 py-3"
                  >
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-warning text-xs text-warning"
                    >
                      …
                    </span>
                    <span className="flex-1 text-ink2">{t(`checklist.items.${item.key}`)}</span>
                    <span className="shrink-0 text-sm font-medium text-warning">{t("checklist.inReview")}</span>
                  </Link>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-hairline2 bg-surface-raised px-3 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <CheckIcon done={false} />
                    <span className="flex-1 text-ink2">{t(`checklist.items.${item.key}`)}</span>
                    <span className="shrink-0 text-sm font-medium text-accent">{t("checklist.todo")} →</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 4. Disponibilité, réglée par la prestataire elle-même. */}
        <AvailabilityToggle
          initialAvailable={profile?.onlineStatus === "ONLINE"}
          disabledReason={!profile ? "needsProfile" : !state.identityVerified ? "needsVerification" : undefined}
        />

        {/* 5. Abonnement (essai, actif, ou rappel si pas encore de profil). */}
        {!subscriptionNeedsAction && (
          <SubscriptionCard locale={locale} view={subscription} wasPaid={wasPaid} maxPhotos={plan.maxPhotos} />
        )}
      </div>
    </main>
  );
}
