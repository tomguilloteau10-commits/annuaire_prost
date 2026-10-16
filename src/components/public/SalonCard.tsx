import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DemoSalon } from "@/modules/showcase/demo-salons";

export function SalonCard({
  salon,
  profiles,
}: {
  salon: DemoSalon;
  /** Annonceuses publiées rattachées à ce salon. */
  profiles: { slug: string; displayName: string }[];
}) {
  const t = useTranslations("salons");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl3 border border-hairline bg-surface shadow-card">
      <div
        className="relative flex aspect-[4/3] items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${salon.gradient[0]}, ${salon.gradient[1]})` }}
      >
        <span className="font-serif text-6xl text-white/20" aria-hidden>
          {salon.monogram}
        </span>
        {/* Fond sombre translucide : reste lisible sur les couvertures claires. */}
        <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-ink2 backdrop-blur">
          {t(`types.${salon.type}`)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-4">
        <h2 className="font-serif text-lg font-medium text-ink2">{salon.name}</h2>
        <p className="text-sm text-ink2-muted">
          {salon.city} ({salon.canton})
        </p>
        {profiles.length > 0 && (
          <p className="mt-2 text-sm text-ink2-muted">
            {t("profilesHere")}{" "}
            {profiles.map((profile, index) => (
              <span key={profile.slug}>
                {index > 0 && ", "}
                <Link href={`/profiles/${profile.slug}`} className="text-ink2 underline-offset-4 hover:underline">
                  {profile.displayName}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}
