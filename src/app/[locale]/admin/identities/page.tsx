import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listIdentityDossiers } from "@/modules/verification/manual-review.service";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { DocumentPreview } from "@/components/admin/DocumentPreview";
import { DossierHeader } from "@/components/admin/DossierHeader";
import { Card } from "@/components/ui/Card";

/**
 * File "Identités à valider" : pièce d'identité recto/verso de chaque
 * prestataire. Valider = "18+ vérifié" ; dans tous les cas les pièces
 * sont supprimées à la décision (ENGINEERING_RULES.md §1).
 */
export default async function IdentitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const dossiers = await listIdentityDossiers();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("queues.identities")}</h1>
        <p className="text-sm text-ink2-muted">{t("identity.intro")}</p>
      </div>
      {dossiers.length === 0 ? (
        <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
      ) : (
        dossiers.map((dossier) => {
          const documents = dossier.provider.verificationDocuments;
          return (
            <Card key={dossier.id} className="flex flex-col gap-4 p-5">
              <DossierHeader
                email={dossier.provider.email}
                profile={dossier.provider.providerProfile}
                submittedAt={dossier.createdAt}
                purgeAt={documents[0]?.purgeAt}
                locale={locale}
              />
              {documents.length === 0 ? (
                <p className="text-sm text-warning">{t("documents.missing")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {documents.map((document) => (
                    <DocumentPreview key={document.id} document={document} />
                  ))}
                </div>
              )}
              <DecisionForm
                decisionUrl={`/api/admin/verifications/${dossier.id}/decision`}
                identity={{ canPublishProfile: dossier.provider.providerProfile?.status === "PENDING_REVIEW" }}
              />
            </Card>
          );
        })
      )}
    </main>
  );
}
