import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link } from "@/i18n/navigation";
import { getProviderDashboardData, getProviderDashboardExtras } from "@/modules/profiles/profile.service";
import { computeProviderDashboardState } from "@/modules/profiles/provider-dashboard";
import { DASHBOARD_PATH, PROFILE_EDIT_PATH } from "@/lib/spaces";
import { Card } from "@/components/ui/Card";

const BIG_BUTTON =
  "inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-medium transition-colors sm:w-auto";

// Écran de fin du formulaire prestataire. Le message vient de l'état réel
// du profil en base (jamais d'un paramètre d'URL) : « en attente de
// vérification » ne s'affiche que si le profil a vraiment été envoyé.
export default async function ProfileDonePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageRole(locale, ["PROVIDER"]);
  const t = await getTranslations("profileDone");
  const checklistT = await getTranslations("dashboard.checklist");

  const { profile, verification, attestationCompleted } = await getProviderDashboardData(user.id);
  const extras = profile ? await getProviderDashboardExtras(profile.id) : { hasWhatsapp: false };
  const state = computeProviderDashboardState({
    profileStatus: profile?.status ?? null,
    attestationCompleted,
    verificationStatus: verification?.status ?? null,
    photoCount: profile?.media.filter((m) => m.status !== "REJECTED").length ?? 0,
    hasWhatsapp: extras.hasWhatsapp,
  });

  const missing = state.checklist.filter((item) => !item.done && !item.pending);
  const variant =
    profile?.status === "PENDING_REVIEW"
      ? "sent"
      : profile?.status === "PUBLISHED" || profile?.status === "SUSPENDED"
        ? "updated"
        : missing.length > 0
          ? "incomplete"
          : "notSent";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <Card className="flex flex-col items-center gap-5 p-6 text-center sm:p-8">
        <span
          aria-hidden
          className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            variant === "incomplete" || variant === "notSent"
              ? "bg-warning-soft text-warning"
              : "bg-success-soft text-success"
          }`}
        >
          {variant === "incomplete" || variant === "notSent" ? "!" : "✓"}
        </span>
        <h1 className="font-serif text-2xl font-medium text-ink2 sm:text-3xl">{t(`${variant}.title`)}</h1>
        <p className="text-base text-ink2-muted">{t(`${variant}.body`)}</p>

        {variant === "incomplete" && missing.length > 0 && (
          <ul className="flex w-full flex-col gap-2 text-left">
            {missing.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline2 bg-surface-raised px-4 py-3 text-ink2 transition-colors hover:bg-surface-hover"
                >
                  <span>{checklistT(`items.${item.key}`)}</span>
                  <span className="shrink-0 text-sm font-medium text-accent">{checklistT("todo")} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href={DASHBOARD_PATH}
            className={`${BIG_BUTTON} bg-accent text-accent-foreground hover:bg-accent-hover`}
          >
            {t("toDashboard")}
          </Link>
          {(variant === "sent" || variant === "updated") && (
            <Link
              href={PROFILE_EDIT_PATH}
              className={`${BIG_BUTTON} border border-hairline2 bg-surface-raised text-ink2 hover:bg-surface-hover`}
            >
              {t("editAgain")}
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}
