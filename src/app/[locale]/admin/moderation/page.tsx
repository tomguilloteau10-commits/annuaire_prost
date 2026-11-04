import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listPendingMedia } from "@/modules/moderation/moderation-queue.service";
import { Link } from "@/i18n/navigation";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { Card } from "@/components/ui/Card";

/** File "Photos à valider". Valider se fait en un clic ; refuser demande un motif. */
export default async function AdminPhotosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const pendingMedia = await listPendingMedia();
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-medium text-ink2">{t("queues.photos")}</h1>
          <p className="text-sm text-ink2-muted">{t("photosIntro")}</p>
        </div>
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
