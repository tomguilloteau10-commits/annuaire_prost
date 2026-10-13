import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { RevealContactButton } from "@/components/public/RevealContactButton";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const profile = await getPublishedProfileBySlug(slug);
  if (!profile) notFound();

  const photoUrls = (
    await Promise.all(profile.media.map((media) => getPublicPhotoUrl(media.id)))
  ).filter((url): url is string => url !== null);
  const [heroPhoto, ...otherPhotos] = photoUrls;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10 sm:py-14">
      {heroPhoto && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl3 border border-hairline bg-surface-raised sm:aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroPhoto} alt="" className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="success">{t("verifiedBadge")}</Badge>
            {profile.onlineStatus === "ONLINE" && (
              <Badge variant="success" dot>
                {t("onlineStatus.ONLINE")}
              </Badge>
            )}
          </div>
        </div>
      )}

      {otherPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {otherPhotos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-square w-full rounded-xl border border-hairline object-cover"
            />
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-medium text-ink2">
            {profile.displayName}
            {profile.age && <span className="text-ink2-muted">, {t("ageYears", { age: profile.age })}</span>}
          </h1>
          <p className="text-sm text-ink2-muted">
            {profile.city.name} ({profile.city.canton}) · {getLocalizedLabel(profile.category.label, locale)}
          </p>
        </div>
        {!heroPhoto && (
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="success">{t("verifiedBadge")}</Badge>
            {profile.onlineStatus === "ONLINE" && (
              <Badge variant="success" dot>
                {t("onlineStatus.ONLINE")}
              </Badge>
            )}
          </div>
        )}
      </div>

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2-muted">
        {profile.description}
      </p>

      {(profile.languages.length > 0 || profile.services.length > 0) && (
        <Card className="flex flex-col gap-4 p-5">
          {profile.languages.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink2-faint">
                {t("languagesLabel")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((l) => (
                  <span
                    key={l.language.code}
                    className="rounded-full border border-hairline2 px-3 py-1 text-sm text-ink2-muted"
                  >
                    {getLocalizedLabel(l.language.label, locale)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.services.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink2-faint">
                {t("servicesLabel")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s) => (
                  <span
                    key={s.service.key}
                    className="rounded-full border border-hairline2 px-3 py-1 text-sm text-ink2-muted"
                  >
                    {getLocalizedLabel(s.service.label, locale)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <WhatsAppButton slug={profile.slug} />
        <RevealContactButton slug={profile.slug} />
      </div>
    </main>
  );
}
