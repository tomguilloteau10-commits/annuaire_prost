import { Link } from "@/i18n/navigation";

export interface StoryData {
  slug: string;
  displayName: string;
  onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  city: { name: string };
  thumbnailUrl: string | null;
}

/**
 * Vignette verticale façon "story" : visuel uniquement pour l'instant
 * (aucun lecteur vidéo), mène à la fiche du profil. Anneau accent si la
 * personne est en ligne (anneau doré lumineux).
 */
export function StoryThumb({ story, className = "" }: { story: StoryData; className?: string }) {
  const ring = story.onlineStatus === "ONLINE" ? "bg-gold-sheen shadow-glow" : "bg-hairline2";

  return (
    <Link href={`/profiles/${story.slug}`} className={`group block ${className}`}>
      <div className={`rounded-[1.15rem] p-[2px] transition-transform duration-300 group-hover:-translate-y-0.5 ${ring}`}>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-ink bg-surface-raised">
          {story.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex flex-col bg-gradient-to-t from-ink/95 via-ink/40 to-transparent px-2.5 pb-2.5 pt-10">
            <span className="truncate font-serif text-[15px] text-ink2">{story.displayName}</span>
            <span className="truncate text-[11px] text-ink2-muted">{story.city.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
