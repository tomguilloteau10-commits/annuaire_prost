import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole } from "@/lib/page-guards";
import { listWorkPermitDossiers } from "@/modules/verification/manual-review.service";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { DocumentPreview } from "@/components/admin/DocumentPreview";
import { DossierHeader } from "@/components/admin/DossierHeader";
import { Card } from "@/components/ui/Card";

/** File "Permis à valider" : permis de travail / contrat déposé (facultatif). */
export default async function PermitsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePageRole(locale, ["ADMIN"]);
  const t = await getTranslations("moderation");
  const dossiers = await listWorkPermitDossiers();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium text-ink2">{t("queues.permits")}</h1>
        <p className="text-sm text-ink2-muted">{t("permit.intro")}</p>
      </div>
      {dossiers.length === 0 ? (
        <p className="text-sm text-ink2-faint">{t("emptyQueue")}</p>
      ) : (
        dossiers.map((dossier) => (
          <Card key={dossier.id} className="flex flex-col gap-4 p-5">
            <DossierHeader
              email={dossier.provider.email}
              profile={dossier.provider.providerProfile}
              submittedAt={dossier.provider.verificationDocuments[0]?.createdAt ?? dossier.attestedAt}
              purgeAt={dossier.provider.verificationDocuments[0]?.purgeAt}
              locale={locale}
            />
            {dossier.provider.verificationDocuments.map((document) => (
              <DocumentPreview key={document.id} document={document} />
            ))}
            <DecisionForm decisionUrl={`/api/admin/work-permits/${dossier.providerId}/decision`} />
          </Card>
        ))
      )}
    </main>
  );
}
