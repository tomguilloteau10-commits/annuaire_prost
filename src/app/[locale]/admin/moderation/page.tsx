import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listPendingProfiles, listPendingMedia } from "@/modules/moderation/moderation-queue.service";
import { listOpenReports } from "@/modules/reports/report.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { Link } from "@/i18n/navigation";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { ResolveReportForm } from "@/components/admin/ResolveReportForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default async function AdminModerationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const tReport = await getTranslations("report");

  const [pendingProfiles, pendingMedia, openReports] = await Promise.all([
    listPendingProfiles(),
    listPendingMedia(),
    listOpenReports(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-medium text-ink2">{t("openReports")}</h2>
        {openReports.length === 0 ? (
          <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {openReports.map((report) => (
              <Card key={report.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.reason === "UNDERAGE" || report.reason === "COERCION" ? "danger" : "warning"}>
                      {tReport(`reasons.${report.reason}`)}
                    </Badge>
                    {report.profile.status === "PUBLISHED" ? (
                      <Link
                        href={`/profiles/${report.profile.slug}`}
                        className="font-medium text-ink2 underline-offset-4 hover:underline"
                      >
                        {report.profile.displayName}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink2">{report.profile.displayName}</span>
                    )}
                  </div>
                  <span className="text-xs text-ink2-faint">{dateFormatter.format(report.createdAt)}</span>
                </div>
                {report.details && (
                  <p className="whitespace-pre-wrap text-sm text-ink2-muted">{report.details}</p>
                )}
                <ResolveReportForm reportId={report.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-medium text-ink2">{t("pendingProfiles")}</h2>
        {pendingProfiles.length === 0 ? (
          <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingProfiles.map((profile) => (
              <Card key={profile.id} className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink2">
                    {profile.displayName}
                    {profile.age && <span className="text-ink2-faint">, {profile.age}</span>}
                  </span>
                  <span className="text-xs text-ink2-faint">
                    {profile.city.name} · {getLocalizedLabel(profile.category.label, locale)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink2-muted">{profile.description}</p>
                <DecisionForm decisionUrl={`/api/admin/moderation/profiles/${profile.id}/decision`} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-serif text-xl font-medium text-ink2">{t("pendingMedia")}</h2>
        {pendingMedia.length === 0 ? (
          <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pendingMedia.map((media) => (
              <Card key={media.id} className="flex flex-col gap-2 p-5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  {media.profile.status === "PUBLISHED" ? (
                    <Link
                      href={`/profiles/${media.profile.slug}`}
                      className="font-medium text-ink2 underline-offset-4 hover:underline"
                    >
                      {media.profile.displayName}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink2">{media.profile.displayName}</span>
                  )}
                  <span className="text-xs text-ink2-faint">{dateFormatter.format(media.createdAt)}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/moderation/media/${media.id}/preview`}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                />
                <DecisionForm decisionUrl={`/api/admin/moderation/media/${media.id}/decision`} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
