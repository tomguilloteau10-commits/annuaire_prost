"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
import { FieldGroup, Label, Select, TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface DecisionFormProps {
  /** ex: "/api/admin/moderation/profiles/abc123/decision" */
  decisionUrl: string;
  /** Champs de résultat d'une vérification d'identité (type de document, pays, publication). */
  identity?: { canPublishProfile: boolean };
  /** Validation impossible pour l'instant (ex. identité pas encore vérifiée) : message affiché. */
  approveBlockedMessage?: string;
}

const DOCUMENT_TYPES = ["id_card", "passport", "residence_permit", "driving_licence"] as const;
const COUNTRIES = ["CH", "FR", "DE", "IT", "AT", "ES", "PT", "RO", "HU", "PL", "BR", "CO", "TH"] as const;

/**
 * Décision de l'admin, commune à toutes les files : "Valider" en un clic
 * (un motif par défaut est enregistré), "Refuser" exige un motif écrit,
 * montré à la prestataire (ENGINEERING_RULES.md §7).
 */
export function DecisionForm({ decisionUrl, identity, approveBlockedMessage }: DecisionFormProps) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [reason, setReason] = useState("");
  const [documentType, setDocumentType] = useState<string>("id_card");
  const [issuingCountry, setIssuingCountry] = useState<string>("CH");
  const [alsoPublishProfile, setAlsoPublishProfile] = useState(identity?.canPublishProfile ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!csrfToken) return;
    if (decision === "REJECTED" && reason.trim().length < 3) {
      setError(t("reasonRequiredToReject"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await sendRequest(decisionUrl, {
      method: "POST",
      csrfToken,
      json: {
        decision,
        reason: reason.trim() || undefined,
        ...(identity ? { documentType, issuingCountry, alsoPublishProfile } : {}),
      },
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error === "verification_required" ? t("verificationRequiredError") : t("decisionError"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {identity && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor={`${decisionUrl}-type`}>{t("identity.documentType")}</Label>
            <Select id={`${decisionUrl}-type`} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`identity.documentTypes.${type}`)}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor={`${decisionUrl}-country`}>{t("identity.issuingCountry")}</Label>
            <Select
              id={`${decisionUrl}-country`}
              value={issuingCountry}
              onChange={(e) => setIssuingCountry(e.target.value)}
            >
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
              <option value="">{t("identity.otherCountry")}</option>
            </Select>
          </FieldGroup>
          {identity.canPublishProfile && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink2 sm:col-span-2">
              <input
                type="checkbox"
                checked={alsoPublishProfile}
                onChange={(e) => setAlsoPublishProfile(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              {t("identity.alsoPublish")}
            </label>
          )}
        </div>
      )}
      <TextArea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("reasonPlaceholder")}
        rows={2}
        className="text-sm"
      />
      {approveBlockedMessage && <p className="text-xs text-warning">{approveBlockedMessage}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          onClick={() => decide("APPROVED")}
          disabled={submitting || !csrfToken || !!approveBlockedMessage}
        >
          {t("approve")}
        </Button>
        <Button variant="danger" onClick={() => decide("REJECTED")} disabled={submitting || !csrfToken}>
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}
