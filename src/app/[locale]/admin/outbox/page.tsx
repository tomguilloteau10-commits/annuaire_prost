import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { getEmailDriver } from "@/modules/email/email.service";

/** Rend les adresses web d'un texte cliquables (liens de réinitialisation). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a key={index} href={part} className="break-all text-accent underline-offset-4 hover:underline">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * Boîte d'envoi de TEST : e-mails que le site aurait envoyés, quand aucun
 * serveur SMTP n'est configuré (pilote « outbox »). Disparaît dès qu'un
 * serveur d'e-mail est configuré. Contenus purgés après 24 heures.
 */
export default async function AdminOutboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  if (getEmailDriver() !== "outbox") notFound();
  const t = await getTranslations("adminOutbox");

  const emails = await prisma.outboxEmail.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const format = new Intl.DateTimeFormat(`${locale}-CH`, { dateStyle: "short", timeStyle: "short" });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-relaxed text-warning">
          {t("notice")}
        </p>
      </div>

      {emails.length === 0 ? (
        <p className="text-sm text-ink2-faint">{t("empty")}</p>
      ) : (
        emails.map((email) => (
          <Card key={email.id} className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink2-faint">
              <span>
                {t("to")} <span className="text-ink2-muted">{email.recipient}</span>
              </span>
              <span>{format.format(email.createdAt)}</span>
            </div>
            <p className="font-medium text-ink2">{email.subject}</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink2-muted">
              <Linkified text={email.body} />
            </p>
          </Card>
        ))
      )}
    </main>
  );
}
