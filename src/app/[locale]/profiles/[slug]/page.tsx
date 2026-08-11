import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { RevealContactButton } from "@/components/public/RevealContactButton";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {t(`onlineStatus.${profile.onlineStatus}`)}
        </span>
      </div>

      <p className="text-sm text-gray-500">
        {profile.city.name} ({profile.city.canton}) · {getLocalizedLabel(profile.category.label, locale)}
      </p>

      <p className="whitespace-pre-wrap text-base text-gray-800">{profile.description}</p>

      {profile.languages.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700">{t("languagesLabel")}</h2>
          <p className="text-sm text-gray-600">
            {profile.languages.map((l) => getLocalizedLabel(l.language.label, locale)).join(", ")}
          </p>
        </div>
      )}

      {profile.services.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700">{t("servicesLabel")}</h2>
          <p className="text-sm text-gray-600">
            {profile.services.map((s) => getLocalizedLabel(s.service.label, locale)).join(", ")}
          </p>
        </div>
      )}

      <RevealContactButton slug={profile.slug} />
    </main>
  );
}
