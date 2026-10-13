import { getTranslations, setRequestLocale } from "next-intl/server";
import { listPublishedProfiles } from "@/modules/profiles/profile.service";
import { withThumbnails } from "@/modules/profiles/profile-thumbnails";
import { StoryThumb } from "@/components/public/StoryThumb";

export default async function StoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("stories");
  const home = await getTranslations("home");

  const stories = await withThumbnails(await listPublishedProfiles({}));

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">{t("title")}</h1>
        <p className="text-sm text-ink2-muted">{t("subtitle")}</p>
      </div>

      {stories.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink2-faint">{home("emptyState")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {stories.map((story) => (
            <StoryThumb key={story.slug} story={story} />
          ))}
        </div>
      )}
    </main>
  );
}
