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

export function ProfileCard({ profile, locale }: { profile: ProfileCardData; locale: string }) {
  const t = useTranslations("profile");

  return (
    <Link
      href={`/profiles/${profile.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl3 border border-hairline bg-surface shadow-card transition-colors hover:border-hairline2"
    >
      <div className="relative aspect-[4/5] w-full bg-surface-raised">
        {profile.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink2-faint">
            {t("noPhoto")}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <Badge variant="success">{t("verifiedBadge")}</Badge>
          {profile.onlineStatus === "ONLINE" && (
            <Badge variant="success" dot>
              {t("onlineStatus.ONLINE")}
            </Badge>
          )}
        </div>
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
    </Link>
  );
}
