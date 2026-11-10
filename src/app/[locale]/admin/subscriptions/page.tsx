import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { Link } from "@/i18n/navigation";
import { listSubscriptionsForAdmin } from "@/modules/subscriptions/subscription.service";
import { PAYMENT_GRACE_DAYS, TRIAL_DAYS, PAID_PERIOD_DAYS } from "@/modules/subscriptions/subscription-rules";
import { SubscriptionActions } from "@/components/admin/SubscriptionActions";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const STATUS_BADGE: Record<string, BadgeVariant> = {
  TRIAL: "accent",
  PAYMENT_DUE: "warning",
  ACTIVE: "success",
  PAUSED: "danger",
};

/**
 * Vue « Abonnements » : chaque prestataire, son statut et sa date clé. Le
 * paiement se fait hors plateforme ; l'admin enregistre seulement
 * « payé » (30 jours actifs, profil republié) ou « en pause » (profil
 * retiré de l'annuaire). Réservée au rôle ADMIN.
 */
export default async function SubscriptionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminSubscriptions");
  const rows = await listSubscriptionsForAdmin();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const dueCount = rows.filter((row) => row.status === "PAYMENT_DUE").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <p className="text-sm text-ink2-muted">
          {t("intro", { trialDays: TRIAL_DAYS, periodDays: PAID_PERIOD_DAYS, graceDays: PAYMENT_GRACE_DAYS })}
        </p>
        <p className="text-sm text-ink2">{dueCount > 0 ? t("dueCount", { count: dueCount }) : t("nothingDue")}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink2-faint">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.profileId}>
              <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink2">{row.displayName}</span>
                    <Badge variant={STATUS_BADGE[row.status]}>{t(`status.${row.status}`)}</Badge>
                    <Badge variant={row.visible ? "success" : "neutral"}>
                      {row.visible ? t("visible") : t("hidden")}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink2">{t(`keyDate.${row.status}`, { date: date.format(row.keyDate) })}</p>
                  {row.status === "PAYMENT_DUE" && row.hiddenFrom && (
                    <p className="text-xs text-warning">
                      {row.listed
                        ? t("hiddenOn", { date: date.format(row.hiddenFrom) })
                        : t("hiddenSince", { date: date.format(row.hiddenFrom) })}
                    </p>
                  )}
                  <p className="truncate text-xs text-ink2-faint">
                    {row.email} · {row.city} · {t(`profileStatus.${row.profileStatus}`)}
                    {row.lastPaymentAt && <> · {t("lastPayment", { date: date.format(row.lastPaymentAt) })}</>}
                  </p>
                  {row.visible && (
                    <Link href={`/profiles/${row.slug}`} className="self-start text-xs text-accent hover:text-accent-hover">
                      {t("viewPublic")} →
                    </Link>
                  )}
                </div>
                <div className="shrink-0">
                  <SubscriptionActions profileId={row.profileId} name={row.displayName} paused={row.status === "PAUSED"} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink2-faint">{t("noOnlinePayment")}</p>
    </main>
  );
}
