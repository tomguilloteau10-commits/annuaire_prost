import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLocalizedLabel } from "@/modules/taxonomies/types";

export interface ProfileCardData {
  slug: string;
  displayName: string;
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
      className="flex flex-col overflow-hidden rounded-lg border border-gray-200 transition hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full bg-gray-100">
        {profile.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            {t("noPhoto")}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">{profile.displayName}</span>
          <span
            className={`h-2 w-2 rounded-full ${profile.onlineStatus === "ONLINE" ? "bg-green-500" : "bg-gray-300"}`}
            title={t(`onlineStatus.${profile.onlineStatus}`)}
          />
        </div>
        <span className="text-sm text-gray-500">
          {profile.city.name} ({profile.city.canton}) · {getLocalizedLabel(profile.category.label, locale)}
        </span>
      </div>
    </Link>
  );
}
