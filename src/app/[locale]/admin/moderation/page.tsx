import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listPendingProfiles, listPendingMedia } from "@/modules/moderation/moderation-queue.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { DecisionForm } from "@/components/admin/DecisionForm";

export default async function AdminModerationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["MODERATOR", "ADMIN"]);
  const t = await getTranslations("moderation");

  const [pendingProfiles, pendingMedia] = await Promise.all([listPendingProfiles(), listPendingMedia()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">{t("pendingProfiles")}</h2>
        {pendingProfiles.length === 0 ? (
          <p className="text-sm text-gray-400">{t("emptyQueue")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingProfiles.map((profile) => (
              <div key={profile.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{profile.displayName}</span>
                  <span className="text-xs text-gray-500">
                    {profile.city.name} · {getLocalizedLabel(profile.category.label, locale)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">{profile.description}</p>
                <DecisionForm decisionUrl={`/api/admin/moderation/profiles/${profile.id}/decision`} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">{t("pendingMedia")}</h2>
        {pendingMedia.length === 0 ? (
          <p className="text-sm text-gray-400">{t("emptyQueue")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pendingMedia.map((media) => (
              <div key={media.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/moderation/media/${media.id}/preview`}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                />
                <DecisionForm decisionUrl={`/api/admin/moderation/media/${media.id}/decision`} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
