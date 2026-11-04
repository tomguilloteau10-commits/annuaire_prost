"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
import { Button } from "@/components/ui/Button";
import { DocumentField, checkDocument } from "@/components/provider/DocumentField";

/**
 * Nouveau dépôt après un refus ou un dossier expiré : pièce d'identité
 * (recto + verso) ou permis de travail. Ouvre un nouveau dossier pour
 * l'équipe, ne valide rien.
 */
export function ResubmitDocumentsForm({ kind }: { kind: "identity" | "workPermit" }) {
  const td = useTranslations("documents");
  const t = useTranslations("verification");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [permit, setPermit] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileError = (file: File | null, required: boolean) => {
    if (!file) return required ? td("errors.missing") : undefined;
    const problem = checkDocument(file);
    return problem === "format" ? td("errors.format") : problem === "too_large" ? td("errors.tooLarge") : undefined;
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    const found =
      kind === "identity"
        ? { identityFront: fileError(front, true), identityBack: fileError(back, true) }
        : { workPermit: fileError(permit, true) };
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    const formData = new FormData();
    if (kind === "identity") {
      formData.append("identityFront", front!);
      formData.append("identityBack", back!);
    } else formData.append("workPermit", permit!);

    const result = await sendRequest("/api/provider/verification/documents", { method: "POST", csrfToken, formData });
    setSubmitting(false);
    if (!result.ok) {
      if (result.status === 0) setFormError(td("errors.network"));
      else if (result.error === "invalid_document" && result.field) {
        setErrors({ [result.field]: result.reason === "too_large" ? td("errors.tooLarge") : td("errors.format") });
      } else setFormError(t("resubmitError"));
      return;
    }
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {kind === "identity" ? (
        <>
          <DocumentField
            id="identityFront"
            label={td("front")}
            file={front}
            error={errors.identityFront}
            onChange={(f) => {
              setFront(f);
              setErrors((e) => ({ ...e, identityFront: fileError(f, false) }));
            }}
          />
          <DocumentField
            id="identityBack"
            label={td("back")}
            hint={td("passportHint")}
            file={back}
            error={errors.identityBack}
            onChange={(f) => {
              setBack(f);
              setErrors((e) => ({ ...e, identityBack: fileError(f, false) }));
            }}
          />
        </>
      ) : (
        <DocumentField
          id="workPermit"
          label={td("workPermit")}
          hint={td("workPermitHint")}
          file={permit}
          error={errors.workPermit}
          onChange={(f) => {
            setPermit(f);
            setErrors((e) => ({ ...e, workPermit: fileError(f, false) }));
          }}
        />
      )}
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" disabled={submitting || !csrfToken} className="w-full sm:w-auto sm:self-start">
        {submitting ? t("sending") : t("resubmit")}
      </Button>
    </form>
  );
}
