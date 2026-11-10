import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { countPendingVerificationDossiers } from "@/modules/verification/manual-review.service";
import { countPaymentsDue } from "@/modules/subscriptions/subscription.service";

// Accueil de l'espace admin : une tuile par file, avec ce qui attend une
// décision (mises en évidence), puis les réglages. Réservé au rôle ADMIN.
export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminHome");
  const nav = await getTranslations("nav");
  const queueT = await getTranslations("moderation.queues");
  const subT = await getTranslations("adminSubscriptions");

  const [dossiers, pendingProfiles, pendingMedia, openReports, activeCategories, activeCities, actionCount, allowedCountries, paymentsDue] =
    await Promise.all([
      countPendingVerificationDossiers(),
      prisma.providerProfile.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.media.count({ where: { status: "PENDING" } }),
      prisma.profileReport.count({ where: { status: "OPEN" } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.city.count({ where: { isActive: true } }),
      prisma.auditLog.count(),
      prisma.allowedCountry.count({ where: { isAllowed: true } }),
      countPaymentsDue(),
    ]);

  const queues = [
    { href: "/admin/identities", title: queueT("identities"), count: dossiers.identities },
    { href: "/admin/permits", title: queueT("permits"), count: dossiers.permits },
    { href: "/admin/profiles", title: queueT("profiles"), count: pendingProfiles },
    { href: "/admin/moderation", title: queueT("photos"), count: pendingMedia },
    { href: "/admin/reports", title: queueT("reports"), count: openReports },
    { href: "/admin/subscriptions", title: subT("paymentsDueTile"), count: paymentsDue },
  ];
  const toReview = queues.reduce((sum, q) => sum + q.count, 0);
  const settings = [
    { href: "/admin/taxonomies", title: nav("taxonomies"), body: t("taxonomiesBody", { categories: activeCategories, cities: activeCities }) },
    { href: "/admin/audit-log", title: nav("auditLog"), body: t("auditLogBody", { count: actionCount }) },
    { href: "/admin/geo-settings", title: nav("geoSettings"), body: t("geoBody", { count: allowedCountries }) },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <p className="text-ink2-muted">{toReview > 0 ? t("toReview", { count: toReview }) : t("nothingToReview")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs font-medium uppercase tracking-wide text-ink2-faint">{t("queuesTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <Link
              key={queue.href}
              href={queue.href}
              className={`flex items-center justify-between gap-3 rounded-xl2 border p-5 shadow-card transition-colors hover:bg-surface-hover ${
                queue.count > 0 ? "border-warning/50 bg-warning-soft" : "border-hairline bg-surface"
              }`}
            >
              <span className="font-serif text-lg font-medium text-ink2">{queue.title}</span>
              <span
                className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-sm font-semibold ${
                  queue.count > 0 ? "bg-warning text-[#2a1f08]" : "bg-surface-raised text-ink2-faint"
                }`}
              >
                {queue.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs font-medium uppercase tracking-wide text-ink2-faint">{t("settingsTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {settings.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="flex flex-col gap-1.5 rounded-xl2 border border-hairline bg-surface p-5 shadow-card transition-colors hover:bg-surface-hover"
            >
              <span className="font-serif text-lg font-medium text-ink2">{tile.title} →</span>
              <span className="text-sm text-ink2-muted">{tile.body}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
