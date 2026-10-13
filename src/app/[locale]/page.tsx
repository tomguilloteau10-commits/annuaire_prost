import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedProfiles, listPublishedProfileCityCounts } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { listCategories, listCities, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { FilterBar } from "@/components/public/FilterBar";
import { ProfileCard } from "@/components/public/ProfileCard";
import { ProfileMapLoader } from "@/components/public/ProfileMapLoader";

interface HomeSearchParams {
  city?: string;
  category?: string;
  language?: string;
  online?: string;
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<HomeSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;
  const t = await getTranslations("home");
  const common = await getTranslations("common");

  const [profiles, categories, languages, cities, cityCounts] = await Promise.all([
    listPublishedProfiles({
      citySlug: filters.city,
      categoryKey: filters.category,
      languageCode: filters.language,
      onlineOnly: filters.online === "true",
    }),
    listCategories(),
    listLanguages(),
    listCities(),
    listPublishedProfileCityCounts(),
  ]);

  const totalProfiles = cityCounts.reduce((sum, c) => sum + c.count, 0);
  const totalCities = cityCounts.length;

  const profilesWithThumbnails = await Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      thumbnailUrl: profile.media[0] ? await getPublicPhotoUrl(profile.media[0].id) : null,
    })),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-14 sm:py-20">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink2-faint">
          {common("betaNotice")}
        </p>
        <h1 className="max-w-xl text-4xl font-medium leading-[1.1] sm:text-5xl">{t("title")}</h1>
        <p className="max-w-md text-base text-ink2-muted">{t("subtitle")}</p>

        {totalProfiles > 0 && (
          <div className="flex items-center gap-4 text-sm text-ink2-muted">
            <span>
              <span className="font-serif text-lg text-ink2">{totalProfiles}</span> {t("statsProfiles")}
            </span>
            <span className="h-4 w-px bg-hairline2" />
            <span>
              <span className="font-serif text-lg text-ink2">{totalCities}</span> {t("statsCities")}
            </span>
          </div>
        )}
      </div>

      <FilterBar
        locale={locale}
        categories={categories}
        languages={languages}
        cities={cities}
        currentFilters={{
          city: filters.city,
          category: filters.category,
          language: filters.language,
          online: filters.online === "true",
        }}
      />

      <div className="flex flex-col gap-2">
        <ProfileMapLoader locale={locale} />
        <p className="text-center text-xs text-ink2-faint">{t("mapCaption")}</p>
      </div>

      {profilesWithThumbnails.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink2-faint">{t("emptyState")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {profilesWithThumbnails.map((profile) => (
            <ProfileCard key={profile.slug} profile={profile} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
