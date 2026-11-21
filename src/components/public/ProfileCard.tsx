import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";

export interface ProfileCardData {
  slug: string;
  displayName: string;
  age: number | null;
  onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  city: { name: string; canton: string };
  category: { label: unknown };
  thumbnailUrl: string | null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Carte de profil, format éditorial : la photo occupe toute la carte, le
 * nom et la ville sont posés dessus sur un dégradé sombre. Repères
 * discrets en haut (vérifiée, en ligne) ; liseré doré pour la vedette.
 */
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
  /** Format un peu plus court et badges plus petits, pour les carrousels. */
  compact?: boolean;
  /** Aperçu non cliquable (tableau de bord prestataire, profil pas forcément publié). */
  preview?: boolean;
}) {
  const t = useTranslations("profile");
  const online = profile.onlineStatus === "ONLINE";
  const cardClasses = `group relative block overflow-hidden rounded-xl3 border bg-surface-raised shadow-card transition-all duration-300 ${
    compact ? "aspect-[4/5]" : "aspect-[3/4]"
  } ${featured ? "border-accent/35" : "border-hairline"}`;

  const content = (
    <>
      {/* Image en position absolue : la hauteur vient uniquement du ratio,
          jamais de la taille d'origine de l'image (cartes toutes égales). */}
      {profile.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-surface-hover to-ink-soft">
          <span className="text-gold font-serif text-5xl italic">{profile.displayName.charAt(0)}</span>
          <span className="text-[11px] text-ink2-faint">{t("noPhoto")}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-card-scrim" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
        <span
          title={t("verifiedBadge")}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[11px] font-medium text-success backdrop-blur-md"
        >
          <CheckIcon />
          {/* Carrousel (cartes étroites) : coche seule, le texte reste lu par les lecteurs d'écran. */}
          <span className={compact ? "sr-only" : ""}>{t("verifiedBadge")}</span>
        </span>
        {online && (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[11px] font-medium text-ink2 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {t("onlineStatus.ONLINE")}
          </span>
        )}
      </div>

      <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 ${compact ? "p-3" : "p-3.5 sm:p-4"}`}>
        {featured && (
          <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-gold-sheen px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
            ★ {t("featuredBadge")}
          </span>
        )}
        <span className={`truncate font-serif leading-tight text-ink2 ${compact ? "text-base" : "text-lg sm:text-xl"}`}>
          {profile.displayName}
          {profile.age && <span className="font-sans text-sm font-light text-ink2/70">, {profile.age}</span>}
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-ink2/65">
          <span className="truncate">{profile.city.name}</span>
          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-accent/70" />
          <span className="truncate">{getLocalizedLabel(profile.category.label, locale)}</span>
        </span>
      </div>
    </>
  );

  if (preview) return <div className={cardClasses}>{content}</div>;
  return (
    <Link
      href={`/profiles/${profile.slug}`}
      className={`${cardClasses} hover:-translate-y-1 hover:border-accent/45 hover:shadow-glow`}
    >
      {content}
    </Link>
  );
}
