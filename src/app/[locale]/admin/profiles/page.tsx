import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listPendingProfiles } from "@/modules/moderation/moderation-queue.service";
import { hasPassedAdultVerification } from "@/modules/verification/verification.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

/**
 * File "Profils à valider" : relecture du contenu. Publier exige une
 * identité déjà validée (vérifié aussi côté serveur, decideOnProfile).
 */
export default async function ProfilesQueuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const pendingProfiles = await listPendingProfiles();
  const verified = await Promise.all(pendingProfiles.map((p) => hasPassedAdultVerification(p.userId)));
  const verifiedUserIds = new Set(pendingProfiles.filter((_, i) => verified[i]).map((p) => p.userId));

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-medium text-ink2">{t("queues.profiles")}</h1>
          <p className="text-sm text-ink2-muted">{t("profilesIntro")}</p>
        </div>
        {pendingProfiles.length === 0 ? (
          <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingProfiles.map((profile) => (
              <Card key={profile.id} className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink2">
                    {profile.displayName}
                    {profile.age && <span className="text-ink2-faint">, {profile.age}</span>}
                  </span>
                  <span className="text-xs text-ink2-faint">
                    {profile.city.name} · {getLocalizedLabel(profile.category.label, locale)}
                  </span>
                </div>
                <div>
                  {verifiedUserIds.has(profile.userId) ? (
                    <Badge variant="success">✓ {t("identityVerified")}</Badge>
                  ) : (
                    <Badge variant="warning">{t("identityNotVerified")}</Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink2-muted">{profile.description}</p>
                <DecisionForm
                  decisionUrl={`/api/admin/moderation/profiles/${profile.id}/decision`}
                  approveBlockedMessage={verifiedUserIds.has(profile.userId) ? undefined : t("validateIdentityFirst")}
                />
              </Card>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
