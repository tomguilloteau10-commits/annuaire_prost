import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedProfiles } from "@/modules/profiles/profile.service";
import { withThumbnails } from "@/modules/profiles/profile-thumbnails";
import { listCategories, listCities, listLanguages } from "@/modules/taxonomies/taxonomy.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { FilterBar } from "@/components/public/FilterBar";
import { ProfileCard } from "@/components/public/ProfileCard";

interface CategorySearchParams {
  city?: string;
  language?: string;
  online?: string;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; key: string }>;
  searchParams: Promise<CategorySearchParams>;
}) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  const filters = await searchParams;
  const t = await getTranslations("categoryPage");
  const home = await getTranslations("home");

  // Catégorie inactive ou inconnue = 404, même règle que les filtres publics.
  const category = (await listCategories()).find((c) => c.key === key);
  if (!category) notFound();

  const [profiles, languages, cities] = await Promise.all([
    listPublishedProfiles({
      categoryKey: key,
      citySlug: filters.city,
      languageCode: filters.language,
      onlineOnly: filters.online === "true",
    }),
    listLanguages(),
    listCities(),
  ]);
  const cards = await withThumbnails(profiles);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">
          {getLocalizedLabel(category.label, locale)}
        </h1>
        <p className="text-sm text-ink2-muted">{t("count", { count: cards.length })}</p>
      </div>

      <FilterBar
        locale={locale}
        categories={[]}
        languages={languages}
        cities={cities}
        hideCategory
        currentFilters={{
          city: filters.city,
          language: filters.language,
          online: filters.online === "true",
        }}
      />

      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink2-faint">{home("emptyState")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((profile) => (
            <ProfileCard key={profile.slug} profile={profile} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
