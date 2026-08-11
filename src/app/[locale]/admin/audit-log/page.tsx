import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="pb-2 pr-4">{t("date")}</th>
                <th className="pb-2 pr-4">{t("actor")}</th>
                <th className="pb-2 pr-4">{t("action")}</th>
                <th className="pb-2 pr-4">{t("target")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-gray-100 align-top">
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-gray-500">
                    {entry.createdAt.toISOString()}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {entry.actor.email} ({entry.actor.role})
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{entry.action}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {entry.targetType} · {entry.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
