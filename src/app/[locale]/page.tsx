import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getPublishedProfileFacets,
  listPublishedProfiles,
  listPublishedProfileCityCounts,
} from "@/modules/profiles/profile.service";
import { withThumbnails } from "@/modules/profiles/profile-thumbnails";
import { listCategories, listCities, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { groupCitiesByCanton } from "@/lib/group-cities";
import { Link } from "@/i18n/navigation";
import { FilterBar } from "@/components/public/FilterBar";
import { parseDirectoryFilters, toProfileFilters, type DirectorySearchParams } from "@/lib/directory-filters";
import { ProfileCard } from "@/components/public/ProfileCard";
import { ProfileMapLoader } from "@/components/public/ProfileMapLoader";
import { WhyUsSection } from "@/components/public/WhyUsSection";
import { HorizontalScroller } from "@/components/public/HorizontalScroller";
import { StoryThumb } from "@/components/public/StoryThumb";


const FEATURED_COUNT = 6;
const STORIES_COUNT = 8;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<DirectorySearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const searchQuery = await searchParams;
  const filters = parseDirectoryFilters(searchQuery);
  const t = await getTranslations("home");
  const common = await getTranslations("common");

  const [profiles, featuredSource, categories, languages, cities, cityCounts, facets] = await Promise.all([
    listPublishedProfiles(toProfileFilters(filters)),
    // Vedette et Stories : toujours issues de l'ensemble complet,
    // indépendamment des filtres actifs sur la liste principale ci-dessous.
    listPublishedProfiles({}),
    listCategories(),
    listLanguages(),
    listCities(),
    listPublishedProfileCityCounts(),
    getPublishedProfileFacets(),
  ]);

  const totalProfiles = cityCounts.reduce((sum, c) => sum + c.count, 0);
  const totalCities = cityCounts.length;

  const [profilesWithThumbnails, allWithThumbnails] = await Promise.all([
    withThumbnails(profiles),
    withThumbnails(featuredSource),
  ]);

  // Vedette : en ligne d'abord, puis les plus récents.
  const featuredProfiles = [...allWithThumbnails]
    .sort((a, b) => {
      if (a.onlineStatus === "ONLINE" && b.onlineStatus !== "ONLINE") return -1;
      if (b.onlineStatus === "ONLINE" && a.onlineStatus !== "ONLINE") return 1;
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    })
    .slice(0, FEATURED_COUNT);

  // Stories : les plus récemment publiés (ordre natif de listPublishedProfiles).
  const stories = allWithThumbnails.slice(0, STORIES_COUNT);

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
            {groupCitiesByCanton(cities).map((group) => (
              <optgroup key={group.canton} label={group.canton}>
                {group.cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </optgroup>
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
          <HorizontalScroller label={t("featuredTitle")}>
            {featuredProfiles.map((profile) => (
              <div key={profile.slug} className="w-36 shrink-0 snap-start sm:w-44">
                <ProfileCard profile={profile} locale={locale} featured compact />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {stories.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-2xl font-medium text-ink2">{t("storiesTitle")}</h2>
            <Link href="/stories" className="text-sm text-accent transition-colors hover:text-accent-hover">
              {t("seeAll")} →
            </Link>
          </div>
          <HorizontalScroller label={t("storiesTitle")}>
            {stories.map((story) => (
              <StoryThumb key={story.slug} story={story} className="w-24 shrink-0 snap-start sm:w-28" />
            ))}
          </HorizontalScroller>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <FilterBar
          locale={locale}
          categories={categories}
          languages={languages}
          cities={cities}
          facets={facets}
          currentFilters={filters}
        />

        <div className="flex flex-col gap-2">
          <ProfileMapLoader locale={locale} />
          <p className="text-center text-xs text-ink2-faint">{t("mapCaption")}</p>
        </div>

        <h2 className="font-serif text-2xl font-medium text-ink2">{t("resultsTitle")}</h2>

        {profilesWithThumbnails.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink2-faint">{t("emptyState")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
