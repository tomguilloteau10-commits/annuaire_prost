import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";

// Accueil de l'espace admin : une tuile par écran, avec ce qui attend une
// action. Réservé au rôle ADMIN (layout + garde de page).
export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminHome");
  const nav = await getTranslations("nav");

  const [pendingMedia, pendingProfiles, openReports, activeCategories, activeCities, actionCount, allowedCountries] =
    await Promise.all([
      prisma.media.count({ where: { status: "PENDING" } }),
      prisma.providerProfile.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.profileReport.count({ where: { status: "OPEN" } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.city.count({ where: { isActive: true } }),
      prisma.auditLog.count(),
      prisma.allowedCountry.count({ where: { isAllowed: true } }),
    ]);
  const toReview = pendingMedia + pendingProfiles + openReports;

  const tiles = [
    {
      href: "/admin/moderation",
      title: nav("moderation"),
      body: t("moderationBody", { media: pendingMedia, profiles: pendingProfiles, reports: openReports }),
      highlight: toReview > 0,
    },
    {
      href: "/admin/taxonomies",
      title: nav("taxonomies"),
      body: t("taxonomiesBody", { categories: activeCategories, cities: activeCities }),
    },
    { href: "/admin/audit-log", title: nav("auditLog"), body: t("auditLogBody", { count: actionCount }) },
    { href: "/admin/geo-settings", title: nav("geoSettings"), body: t("geoBody", { count: allowedCountries }) },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <p className="text-ink2-muted">{toReview > 0 ? t("toReview", { count: toReview }) : t("nothingToReview")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`flex flex-col gap-2 rounded-xl2 border p-5 shadow-card transition-colors hover:bg-surface-hover ${
              tile.highlight ? "border-warning/50 bg-warning-soft" : "border-hairline bg-surface"
            }`}
          >
            <span className="font-serif text-lg font-medium text-ink2">{tile.title} →</span>
            <span className="text-sm text-ink2-muted">{tile.body}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
