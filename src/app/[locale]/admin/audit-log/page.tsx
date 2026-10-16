import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export default async function AdminAuditLogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("adminAuditLog");

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { email: true, role: true } } },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>

      {entries.length === 0 ? (
        <p className="text-sm text-ink2-faint">{t("empty")}</p>
      ) : (
        <Card className="overflow-x-auto p-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-ink2-faint">
                <th className="pb-2 pr-4 font-medium">{t("date")}</th>
                <th className="pb-2 pr-4 font-medium">{t("actor")}</th>
                <th className="pb-2 pr-4 font-medium">{t("action")}</th>
                <th className="pb-2 pr-4 font-medium">{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-hairline align-top">
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-ink2-faint">
                    {entry.createdAt.toISOString()}
                  </td>
                  <td className="py-2 pr-4 text-xs text-ink2-muted">
                    {entry.actor.email} ({entry.actor.role})
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-ink2">{entry.action}</td>
                  <td className="py-2 pr-4 text-xs text-ink2-faint">
                    {entry.targetType} · {entry.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
