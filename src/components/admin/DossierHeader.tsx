import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

/** En-tête commun d'un dossier : qui, quel profil, depuis quand, suppression automatique. */
export function DossierHeader({
  email,
  profile,
  submittedAt,
  purgeAt,
  locale,
}: {
  email: string;
  profile: { displayName: string; status: string; city: { name: string; canton: string } } | null;
  submittedAt: Date;
  purgeAt?: Date;
  locale: string;
}) {
  const t = useTranslations("moderation.documents");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink2">{profile?.displayName ?? t("noProfileYet")}</span>
        {profile && (
          <span className="text-sm text-ink2-muted">
            {profile.city.name} ({profile.city.canton})
          </span>
        )}
        {profile && <Badge variant="neutral">{t(`profileStatus.${profile.status}`)}</Badge>}
      </div>
      <p className="text-xs text-ink2-faint">
        {email} · {t("submittedAt", { date: date.format(submittedAt) })}
        {purgeAt && <> · {t("autoDelete", { date: date.format(purgeAt) })}</>}
      </p>
    </div>
  );
}
