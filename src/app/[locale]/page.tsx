import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedProfiles, listPublishedProfileCityCounts } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { listCategories, listCities, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { FilterBar } from "@/components/public/FilterBar";
import { ProfileCard } from "@/components/public/ProfileCard";
import { ProfileMapLoader } from "@/components/public/ProfileMapLoader";
import { WhyUsSection } from "@/components/public/WhyUsSection";

interface HomeSearchParams {
  city?: string;
  category?: string;
  language?: string;
  online?: string;
}

const FEATURED_COUNT = 6;

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

  const [profiles, featuredSource, categories, languages, cities, cityCounts] = await Promise.all([
    listPublishedProfiles({
      citySlug: filters.city,
      categoryKey: filters.category,
      languageCode: filters.language,
      onlineOnly: filters.online === "true",
    }),
    // Bande "profils en vedette" : toujours issue de l'ensemble complet,
    // indépendamment des filtres actifs sur la liste principale ci-dessous.
    listPublishedProfiles({}),
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

  const featuredProfiles = await Promise.all(
    [...featuredSource]
      .sort((a, b) => {
        if (a.onlineStatus === "ONLINE" && b.onlineStatus !== "ONLINE") return -1;
        if (b.onlineStatus === "ONLINE" && a.onlineStatus !== "ONLINE") return 1;
        return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
      })
      .slice(0, FEATURED_COUNT)
      .map(async (profile) => ({
        ...profile,
        thumbnailUrl: profile.media[0] ? await getPublicPhotoUrl(profile.media[0].id) : null,
      })),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-4 py-14 sm:py-20">
      <div className="flex flex-col items-center gap-5 text-center">
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
            <span className="h-4 w-px bg-hairline2" />
            <span>
              {/* 100% par construction : seul un profil ayant passé la
                  vérification 18+ et la modération humaine peut être
                  PUBLISHED (ENGINEERING_RULES.md §2). */}
              <span className="font-serif text-lg text-ink2">100%</span> {t("statsVerified")}
            </span>
          </div>
        )}

        <form method="GET" className="flex w-full max-w-md items-center gap-2">
          <label htmlFor="hero-city" className="sr-only">
            {t("heroSearchLabel")}
          </label>
          <select
            id="hero-city"
            name="city"
            defaultValue={filters.city ?? ""}
            className="w-full rounded-xl border border-hairline2 bg-surface-raised px-3.5 py-2.5 text-sm text-ink2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">{t("heroSearchLabel")}</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name} ({city.canton})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            {t("heroSearchCta")}
          </button>
        </form>
      </div>

      {featuredProfiles.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl font-medium text-ink2">{t("featuredTitle")}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featuredProfiles.map((profile) => (
              <div key={profile.slug} className="w-48 shrink-0 sm:w-56">
                <ProfileCard profile={profile} locale={locale} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-6">
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

        <h2 className="font-serif text-2xl font-medium text-ink2">{t("resultsTitle")}</h2>

        {profilesWithThumbnails.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink2-faint">{t("emptyState")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {profilesWithThumbnails.map((profile) => (
              <ProfileCard key={profile.slug} profile={profile} locale={locale} />
            ))}
          </div>
        )}
      </section>

      <WhyUsSection />
    </main>
  );
}
