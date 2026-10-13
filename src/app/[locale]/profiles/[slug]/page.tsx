import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { ProfileGallery } from "@/components/public/ProfileGallery";
import { ContactBlock } from "@/components/public/ContactBlock";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

const STATUS_BADGE: Record<"ONLINE" | "AWAY" | "OFFLINE", BadgeVariant> = {
  ONLINE: "successOnImage",
  AWAY: "warning",
  OFFLINE: "neutral",
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-hairline2 px-3 py-1 text-sm text-ink2-muted">{children}</span>
  );
}

// Page publique, sans connexion. Aucune donnée de contact n'est lue ici :
// getPublishedProfileBySlug() ne sélectionne pas ProfileContact, et le
// contact n'arrive qu'au clic dans ContactBlock (ENGINEERING_RULES.md §5).
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Link href="/" className="self-start text-sm text-ink2-muted transition-colors hover:text-ink2">
        ← {t("backToDirectory")}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <ProfileGallery photos={photoUrls} className="md:col-start-1 md:row-start-1" />

        {/* Infos + contact : sous la galerie sur mobile, colonne de droite
            (collante) sur desktop — le contact reste visible en scrollant. */}
        <aside className="flex flex-col gap-6 md:sticky md:top-36 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">
              {profile.displayName}
              {profile.age && <span className="text-ink2-muted">, {t("ageYears", { age: profile.age })}</span>}
            </h1>
            <p className="text-ink2-muted">
              {profile.city.name} ({profile.city.canton}) · {getLocalizedLabel(profile.category.label, locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="successOnImage" className="border border-hairline">
                ✓ {t("verifiedBadge")}
              </Badge>
              <Badge variant={STATUS_BADGE[profile.onlineStatus]} className="border border-hairline" dot>
                {t(`onlineStatus.${profile.onlineStatus}`)}
              </Badge>
            </div>
          </div>

          <ContactBlock slug={profile.slug} />
        </aside>

        <div className="flex flex-col gap-8 md:col-start-1 md:row-start-2">
          <section className="flex flex-col gap-3">
            <h2 className="font-serif text-xl font-medium text-ink2">{t("aboutTitle")}</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink2-muted">{profile.description}</p>
          </section>

          {(profile.languages.length > 0 || profile.services.length > 0) && (
            <section className="flex flex-col gap-4">
              <h2 className="font-serif text-xl font-medium text-ink2">{t("detailsTitle")}</h2>
              {profile.languages.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-ink2-faint">
                    {t("languagesLabel")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((l) => (
                      <Pill key={l.language.code}>{getLocalizedLabel(l.language.label, locale)}</Pill>
                    ))}
                  </div>
                </div>
              )}
              {profile.services.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-ink2-faint">
                    {t("servicesLabel")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.services.map((s) => (
                      <Pill key={s.service.key}>{getLocalizedLabel(s.service.label, locale)}</Pill>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-hairline pt-5 text-xs text-ink2-faint sm:flex-row sm:items-center sm:justify-between md:col-span-2 md:row-start-3">
          <p>{t("locationNotice")}</p>
          <Link
            href={`/profiles/${profile.slug}/report`}
            className="self-start underline-offset-4 transition-colors hover:text-ink2-muted hover:underline sm:self-auto"
          >
            {t("reportProfile")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
