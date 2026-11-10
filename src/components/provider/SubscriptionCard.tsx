import { getTranslations } from "next-intl/server";
import type { SubscriptionView } from "@/modules/subscriptions/subscription-rules";
import { TRIAL_DAYS } from "@/modules/subscriptions/subscription-rules";

const TONE = {
  TRIAL: { box: "border-hairline bg-surface", badge: "bg-accent-soft text-accent" },
  ACTIVE: { box: "border-hairline bg-surface", badge: "bg-success-soft text-success" },
  PAYMENT_DUE: { box: "border-warning/50 bg-warning-soft", badge: "bg-warning text-[#2a1f08]" },
  PAUSED: { box: "border-danger/40 bg-danger-soft", badge: "bg-danger-soft text-danger" },
} as const;

/**
 * « Mon abonnement » : statut et date clé, en clair. Le règlement se fait
 * hors du site (facture, TWINT, virement) : aucun formulaire de paiement,
 * aucune donnée bancaire demandée (ENGINEERING_RULES.md §4).
 */
export async function SubscriptionCard({
  locale,
  view,
  wasPaid,
  maxPhotos,
}: {
  locale: string;
  /** null : pas encore de profil (l'essai démarre à sa création). */
  view: SubscriptionView | null;
  /** A déjà été réglé une fois (texte « période terminée » plutôt que « mois gratuit terminé »). */
  wasPaid: boolean;
  maxPhotos: number;
}) {
  const t = await getTranslations("dashboard.subscription");
  const date = (d: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d);

  if (!view) {
    return (
      <section className="flex flex-col gap-1.5 rounded-xl2 border border-hairline bg-surface p-5 shadow-card">
        <h2 className="font-sans text-sm font-medium text-ink2-muted">{t("title")}</h2>
        <p className="text-ink2">{t("beforeProfile", { days: TRIAL_DAYS })}</p>
        <p className="text-sm text-ink2-faint">{t("photos", { maxPhotos })}</p>
      </section>
    );
  }

  const tone = TONE[view.status];
  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-2.5 rounded-xl2 border p-5 shadow-card ${tone.box}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-sm font-medium text-ink2-muted">{t("title")}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone.badge}`}>{t(`status.${view.status}`)}</span>
      </div>
      <p className="font-serif text-lg font-medium text-ink2">{t(`headline.${view.status}`, { date: date(view.keyDate) })}</p>

      {view.status === "TRIAL" && <p className="text-sm text-ink2-muted">{t("trialBody")}</p>}
      {view.status === "ACTIVE" && <p className="text-sm text-ink2-muted">{t("activeBody")}</p>}
      {view.status === "PAYMENT_DUE" && (
        <>
          <p className="text-ink2">{wasPaid ? t("dueBodyRenewal") : t("dueBodyTrial")}</p>
          {view.hiddenFrom && (
            <p className="text-sm text-ink2-muted">
              {view.listed ? t("hiddenOn", { date: date(view.hiddenFrom) }) : t("hiddenNow")}
            </p>
          )}
        </>
      )}
      {view.status === "PAUSED" && <p className="text-ink2">{t("pausedBody")}</p>}

      <p className="text-xs text-ink2-faint">
        {t("photos", { maxPhotos })} {t("offline")}
      </p>
    </section>
  );
}
