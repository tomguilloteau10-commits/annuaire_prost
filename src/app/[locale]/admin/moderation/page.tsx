import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listPendingProfiles, listPendingMedia } from "@/modules/moderation/moderation-queue.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { Card } from "@/components/ui/Card";

export default async function AdminModerationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["MODERATOR", "ADMIN"]);
  const t = await getTranslations("moderation");

  const [pendingProfiles, pendingMedia] = await Promise.all([listPendingProfiles(), listPendingMedia()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-14 sm:py-20">
      <h1 className="font-serif text-3xl font-medium text-ink2">{t("title")}</h1>

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
