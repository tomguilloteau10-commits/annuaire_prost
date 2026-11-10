"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
import { isValidEmail, isValidPhoneNumber, isValidWhatsapp, isValidInstagram } from "@/modules/profiles/contact-validation";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export interface ContactFormProps {
  initialPhone: string;
  initialEmail: string;
  initialWhatsapp: string;
  initialInstagram: string;
  /** Libellé du bouton (ex. "Terminer" en fin de parcours). */
  submitLabel?: string;
  /** Contenu affiché à gauche du bouton (ex. "Précédent"). */
  secondaryAction?: React.ReactNode;
  onSaved?: () => void | Promise<void>;
}

type Field = "whatsapp" | "phone" | "email" | "instagram";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  );
}

// Formulaire distinct du reste du profil à dessein : le contact vit dans
// sa propre table côté serveur (ProfileContact) et sa propre route
// (/api/provider/profile/contact) — jamais mélangé au reste du profil,
// cohérent avec ENGINEERING_RULES.md §5. WhatsApp est le canal de contact
// principal (obligatoire) ; téléphone, email et Instagram sont facultatifs
// et peuvent être effacés (case vidée = valeur supprimée).
export function ContactForm({
  initialPhone,
  initialEmail,
  initialWhatsapp,
  initialInstagram,
  submitLabel,
  secondaryAction,
  onSaved,
}: ContactFormProps) {
  const t = useTranslations("profileEdit");
  const csrfToken = useCsrfToken();
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [instagram, setInstagram] = useState(initialInstagram);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Partial<Record<Field, string>> {
    const next: Partial<Record<Field, string>> = {};
    if (!whatsapp.trim()) next.whatsapp = t("contactErrors.whatsappRequired");
    else if (!isValidWhatsapp(whatsapp)) next.whatsapp = t("contactErrors.whatsappInvalid");
    if (phone.trim() && !isValidPhoneNumber(phone)) next.phone = t("contactErrors.phoneInvalid");
    if (email.trim() && !isValidEmail(email)) next.email = t("contactErrors.emailInvalid");
    if (instagram.trim() && !isValidInstagram(instagram)) next.instagram = t("contactErrors.instagramInvalid");
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    const found = validate();
    setErrors(found);
    setFormError(null);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }

    setSubmitting(true);
    const result = await sendRequest("/api/provider/profile/contact", {
      method: "PUT",
      csrfToken,
      json: {
        // Chaîne vide = effacer la valeur enregistrée.
        phone: phone.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      },
    });

    if (!result.ok) {
      setSubmitting(false);
      if (result.status === 0) setFormError(t("networkError"));
      else if (result.error === "invalid_input" && result.field) {
        setErrors({
          [result.field]: t(`contactErrors.${result.field}Invalid`),
        });
      } else setFormError(t("saveError"));
      return;
    }
    await onSaved?.();
    setSubmitting(false);
  }

  // Les messages suivent la saisie : un champ corrigé perd son erreur aussitôt.
  // Une erreur venue du serveur (sans équivalent local) reste jusqu'au prochain envoi.
  const live = validate();
  const shown: Partial<Record<Field, string>> = {};
  for (const key of Object.keys(errors) as Field[]) {
    const local = live[key];
    if (local) shown[key] = local;
    else if (!["whatsapp", "phone", "email", "instagram"].includes(key)) shown[key] = errors[key];
  }

  const inputProps = (field: Field) => ({
    id: `contact-${field}`,
    "aria-invalid": shown[field] ? true : undefined,
    "aria-describedby": shown[field] ? `contact-${field}-error` : undefined,
  });

  return (
    <Card className="w-full max-w-md p-5">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-lg font-medium text-ink2">{t("contactTitle")}</h2>
          <p className="text-sm text-ink2-muted">{t("contactHint")}</p>
        </div>
        <FieldGroup>
          <Label htmlFor="contact-whatsapp">{t("whatsappLabel")}</Label>
          <TextInput
            {...inputProps("whatsapp")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+41 79 123 45 67"
            maxLength={64}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <p className="text-xs text-ink2-faint">{t("whatsappHint")}</p>
          <FieldError id="contact-whatsapp-error" message={shown.whatsapp} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="contact-instagram">{t("instagramLabel")}</Label>
          <TextInput
            {...inputProps("instagram")}
            placeholder="@votre.compte"
            maxLength={100}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="contact-phone">{t("phoneLabel")}</Label>
          <TextInput
            {...inputProps("phone")}
            type="tel"
            inputMode="tel"
            maxLength={32}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <FieldError id="contact-phone-error" message={shown.phone} />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="contact-email">{t("contactEmailLabel")}</Label>
          <TextInput
            {...inputProps("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError id="contact-email-error" message={shown.email} />
        </FieldGroup>
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="flex gap-2">
          {secondaryAction}
          <Button type="submit" disabled={submitting || !csrfToken} size="lg" className="flex-1 sm:flex-none">
            {submitting ? t("saving") : (submitLabel ?? t("contactSave"))}
          </Button>
        </div>
      </form>
    </Card>
  );
}
