import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listOpenReports } from "@/modules/reports/report.service";
import { Link } from "@/i18n/navigation";
import { ResolveReportForm } from "@/components/admin/ResolveReportForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

/** File "Signalements" : signalements de visiteurs, les plus graves d'abord. */
export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const tReport = await getTranslations("report");
  const openReports = await listOpenReports();
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <section className="flex flex-col gap-4">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("queues.reports")}</h1>
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

    </main>
  );
}
