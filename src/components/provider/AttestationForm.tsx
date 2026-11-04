"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
import { DASHBOARD_PATH, PROFILE_EDIT_PATH } from "@/lib/spaces";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentField, checkDocument } from "@/components/provider/DocumentField";

const CHECKS = [
  "attestedAdult",
  "attestedVoluntary",
  "attestedAuthorizedToWorkInSwitzerland",
  "attestedCantonalDeclaration",
] as const;
type CheckKey = (typeof CHECKS)[number];
type DocKey = "identityFront" | "identityBack" | "workPermit";

/**
 * Étape "Majorité & autorisation" : pièce d'identité recto/verso
 * (obligatoire), permis de travail/contrat (facultatif) et cases
 * d'attestation. L'envoi ouvre un dossier que seule l'équipe valide.
 */
export function AttestationForm() {
  const t = useTranslations("onboarding");
  const td = useTranslations("documents");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    identityFront: null,
    identityBack: null,
    workPermit: null,
  });
  const [checked, setChecked] = useState<Record<CheckKey, boolean>>({
    attestedAdult: false,
    attestedVoluntary: false,
    attestedAuthorizedToWorkInSwitzerland: false,
    attestedCantonalDeclaration: false,
  });
  const [errors, setErrors] = useState<Partial<Record<DocKey | CheckKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function documentError(reason: string | null | undefined) {
    if (reason === "format") return td("errors.format");
    if (reason === "too_large") return td("errors.tooLarge");
    if (reason === "missing") return td("errors.missing");
    return undefined;
  }

  function setFile(key: DocKey, file: File | null) {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setErrors((prev) => ({ ...prev, [key]: file ? documentError(checkDocument(file)) : undefined }));
  }

  function validate() {
    const next: Partial<Record<DocKey | CheckKey, string>> = {};
    for (const key of ["identityFront", "identityBack"] as const) {
      const file = files[key];
      next[key] = file ? documentError(checkDocument(file)) : td("errors.missing");
    }
    if (files.workPermit) next.workPermit = documentError(checkDocument(files.workPermit));
    for (const key of CHECKS) if (!checked[key]) next[key] = t("errors.checkRequired");
    return Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as typeof next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(first)?.closest("div")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("identityFront", files.identityFront!);
    formData.append("identityBack", files.identityBack!);
    if (files.workPermit) formData.append("workPermit", files.workPermit);
    for (const key of CHECKS) formData.append(key, String(checked[key]));

    const result = await sendRequest<{ hasProfile: boolean }>("/api/onboarding/attestation", {
      method: "POST",
      csrfToken,
      formData,
    });
    if (!result.ok) {
      setSubmitting(false);
      if (result.status === 0) setFormError(td("errors.network"));
      else if (result.error === "invalid_document" && result.field) {
        setErrors({ [result.field]: documentError(result.reason) ?? td("errors.format") });
      } else setFormError(t("submitError"));
      return;
    }
    router.push(result.data.hasProfile ? DASHBOARD_PATH : PROFILE_EDIT_PATH);
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-5">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-lg font-medium text-ink2">{t("identityTitle")}</h2>
          <p className="text-sm text-ink2-muted">{t("identityIntro")}</p>
        </div>
        <DocumentField
          id="identityFront"
          label={td("front")}
          file={files.identityFront}
          error={errors.identityFront}
          onChange={(f) => setFile("identityFront", f)}
        />
        <DocumentField
          id="identityBack"
          label={td("back")}
          hint={td("passportHint")}
          file={files.identityBack}
          error={errors.identityBack}
          onChange={(f) => setFile("identityBack", f)}
        />
        <p className="rounded-xl border border-hairline bg-surface-raised px-3.5 py-3 text-xs text-ink2-muted">
          🔒 {t("privacyNote")}
        </p>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-serif text-lg font-medium text-ink2">{t("authorizationTitle")}</h2>
        <DocumentField
          id="workPermit"
          label={td("workPermit")}
          hint={td("workPermitHint")}
          optional
          file={files.workPermit}
          error={errors.workPermit}
          onChange={(f) => setFile("workPermit", f)}
        />
        <div className="flex flex-col gap-2.5">
          {CHECKS.map((key) => (
            <div key={key} className="flex flex-col gap-1">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors ${
                  checked[key] ? "border-accent/60 bg-accent-soft text-ink2" : "border-hairline2 text-ink2-muted"
                }`}
              >
                <input
                  id={key}
                  type="checkbox"
                  checked={checked[key]}
                  onChange={(e) => {
                    setChecked((prev) => ({ ...prev, [key]: e.target.checked }));
                    if (e.target.checked) setErrors((prev) => ({ ...prev, [key]: undefined }));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
                />
                <span>{t(`fields.${key}`)}</span>
              </label>
              {errors[key] && <p className="text-sm text-danger">{errors[key]}</p>}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-sm text-ink2-muted">{t("whatNext")}</p>
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" disabled={submitting || !csrfToken} className="w-full sm:w-auto sm:self-start">
        {submitting ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
