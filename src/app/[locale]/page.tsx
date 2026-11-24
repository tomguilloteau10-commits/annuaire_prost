import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getPublishedProfileFacets,
  listPublishedProfiles,
  listPublishedProfileCityCounts,
} from "@/modules/profiles/profile.service";
import { withThumbnails } from "@/modules/profiles/profile-thumbnails";
import { listCategories, listCities, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { Link } from "@/i18n/navigation";
import { FilterBar } from "@/components/public/FilterBar";
import {
  hasActiveFilters,
  parseDirectoryFilters,
  toProfileFilters,
  type DirectorySearchParams,
} from "@/lib/directory-filters";
import { ProfileCard } from "@/components/public/ProfileCard";
import { ProfileMapLoader } from "@/components/public/ProfileMapLoader";
import { WhyUsSection } from "@/components/public/WhyUsSection";
import { HorizontalScroller } from "@/components/public/HorizontalScroller";
import { StoryThumb } from "@/components/public/StoryThumb";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

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
  const isFiltering = hasActiveFilters(filters);
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

  const results = (
    <section id="resultats" className="flex scroll-mt-32 flex-col gap-6">
      <Reveal>
        <SectionHeading
          eyebrow={t("resultsEyebrow")}
          title={t("resultsTitle")}
          action={
            isFiltering && (
              <span className="text-ink2-muted">
                {t("resultsCount", { count: profilesWithThumbnails.length })}
              </span>
            )
          }
        />
      </Reveal>
      {profilesWithThumbnails.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink2-faint">{isFiltering ? t("noMatch") : t("emptyState")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {profilesWithThumbnails.map((profile, index) => (
            // Cascade ligne par ligne : chaque carte d'une rangée arrive un peu après la précédente.
            <Reveal key={profile.slug} delay={(index % 4) * 80}>
              <ProfileCard profile={profile} locale={locale} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );

  const map = (
    <Reveal className="flex flex-col gap-2">
      <ProfileMapLoader locale={locale} />
      <p className="text-center text-xs text-ink2-faint">{t("mapCaption")}</p>
    </Reveal>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-20 px-4 pb-14 pt-12 sm:pt-20">
      <div className="flex flex-col items-center gap-7 text-center">
        <p
          style={{ animationDelay: "0ms" }}
          className="hero-in inline-flex items-center gap-2 rounded-full border border-hairline2 bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-ink2-muted sm:text-[11px] sm:tracking-[0.18em]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {common("betaNotice")}
        </p>
        <h1
          style={{ animationDelay: "90ms" }}
          className="hero-in max-w-4xl font-serif text-[2.35rem] font-light leading-[1.05] tracking-tight text-ink2 sm:text-6xl lg:text-7xl"
        >
          {t("heroLead")} <em className="text-gold font-normal">{t("heroAccent")}</em> {t("heroTail")}
        </h1>
        <p
          style={{ animationDelay: "200ms" }}
          className="hero-in max-w-lg text-base leading-relaxed text-ink2-muted sm:text-lg"
        >
          {t("subtitle")}
        </p>

        {totalProfiles > 0 && (
          <dl
            style={{ animationDelay: "300ms" }}
            className="hero-in flex items-stretch divide-x divide-hairline2 rounded-2xl border border-hairline bg-white/[0.02] px-2 py-3 backdrop-blur-sm"
          >
            {[
              { value: totalProfiles, label: t("statsProfiles") },
              { value: totalCities, label: t("statsCities") },
              // 100% par construction : seul un profil ayant passé la
              // vérification 18+ et la modération humaine est visible
              // (ENGINEERING_RULES.md §2).
              { value: "100%", label: t("statsVerified") },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 px-5 sm:px-8">
                <dd className="text-gold font-serif text-2xl leading-none sm:text-3xl">{stat.value}</dd>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-ink2-faint">{stat.label}</dt>
              </div>
            ))}
          </dl>
        )}

        {/* Tous les filtres au même endroit, en haut de page (canton, ville,
            catégorie, langue, en ligne + "Plus de filtres"). */}
        <div
          style={{ animationDelay: "400ms" }}
          className="hero-in glass w-full rounded-xl3 p-3 text-left shadow-pop ring-1 ring-inset ring-accent/10 sm:p-4"
        >
          <FilterBar
            locale={locale}
            categories={categories}
            languages={languages}
            cities={cities}
            facets={facets}
            currentFilters={filters}
          />
        </div>
      </div>

      {/* Filtre actif : les résultats viennent juste sous les filtres. */}
      {isFiltering && results}

      {featuredProfiles.length > 0 && (
        <Reveal>
          <section className="flex flex-col gap-6">
            <SectionHeading eyebrow={t("featuredEyebrow")} title={t("featuredTitle")} />
            <HorizontalScroller label={t("featuredTitle")}>
              {featuredProfiles.map((profile) => (
                <div key={profile.slug} className="w-44 shrink-0 snap-start sm:w-56">
                  <ProfileCard profile={profile} locale={locale} featured compact />
                </div>
              ))}
            </HorizontalScroller>
          </section>
        </Reveal>
      )}

      {stories.length > 0 && (
        <Reveal>
          <section className="flex flex-col gap-6">
            <SectionHeading
              eyebrow={t("storiesEyebrow")}
              title={t("storiesTitle")}
              action={
                <Link href="/stories" className="text-accent transition-colors hover:text-accent-hover">
                  {t("seeAll")} →
                </Link>
              }
            />
            <HorizontalScroller label={t("storiesTitle")}>
              {stories.map((story) => (
                <StoryThumb key={story.slug} story={story} className="w-28 shrink-0 snap-start sm:w-32" />
              ))}
            </HorizontalScroller>
          </section>
        </Reveal>
      )}

      {map}
      {!isFiltering && results}

      <WhyUsSection />
    </main>
  );
}
