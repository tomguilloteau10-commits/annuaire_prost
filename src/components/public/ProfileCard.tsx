import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { Badge } from "@/components/ui/Badge";

export interface ProfileCardData {
  slug: string;
  displayName: string;
  age: number | null;
  onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  city: { name: string; canton: string };
  category: { label: unknown };
  thumbnailUrl: string | null;
}

export function ProfileCard({
  profile,
  locale,
  featured = false,
  compact = false,
  preview = false,
}: {
  profile: ProfileCardData;
  locale: string;
  featured?: boolean;
  /** Format carré et badges empilés, pour les carrousels. */
  compact?: boolean;
  /** Aperçu non cliquable (tableau de bord prestataire, profil pas forcément publié). */
  preview?: boolean;
}) {
  const t = useTranslations("profile");
  const cardClasses =
    "group flex h-full flex-col overflow-hidden rounded-xl3 border border-hairline bg-surface shadow-card transition-colors";

  const content = (
    <>
      {/* Image en position absolue : la hauteur du cadre vient uniquement du
          ratio, jamais de la taille d'origine de l'image (sinon certains
          moteurs, dont Safari, peuvent donner des cartes de hauteurs
          différentes). */}
      <div
        className={`relative w-full shrink-0 overflow-hidden bg-surface-raised ${
          compact ? "aspect-square" : "aspect-[4/5]"
        }`}
      >
        {profile.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-ink2-faint">
            {t("noPhoto")}
          </div>
        )}

        <div
          className={`absolute inset-x-0 top-0 flex items-start p-2 ${
            compact ? "flex-col gap-1" : "justify-between"
          }`}
        >
          <Badge variant="successOnImage">{t("verifiedBadge")}</Badge>
          {profile.onlineStatus === "ONLINE" && (
            <Badge variant="successOnImage" dot>
              {t("onlineStatus.ONLINE")}
            </Badge>
          )}
        </div>

        {featured && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="featured">★ {t("featuredBadge")}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 p-2.5">
        <span className="truncate font-serif text-sm font-medium text-ink2">
          {profile.displayName}
          {profile.age && <span className="text-ink2-muted">, {profile.age}</span>}
        </span>
        <span className="truncate text-xs text-ink2-muted">
          {profile.city.name} · {getLocalizedLabel(profile.category.label, locale)}
        </span>
      </div>
    </>
  );

  if (preview) return <div className={cardClasses}>{content}</div>;
  return (
    <Link href={`/profiles/${profile.slug}`} className={`${cardClasses} hover:border-hairline2`}>
      {content}
    </Link>
  );
}
