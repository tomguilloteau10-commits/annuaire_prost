"use client";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { FieldGroup, Label, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export interface ContactFormProps {
  initialPhone: string;
  initialEmail: string;
  initialWhatsapp: string;
  initialInstagram: string;
  onSaved?: () => void;
}

// Formulaire distinct de ProfileEditForm/ProfileWizard à dessein : le
// contact vit dans sa propre table côté serveur (ProfileContact) et sa
// propre route (/api/provider/profile/contact) — jamais mélangé au reste
// du profil, cohérent avec ENGINEERING_RULES.md §5. WhatsApp est le canal
// de contact principal (obligatoire) ; téléphone, email et Instagram sont
// des compléments optionnels.
export function ContactForm({
  initialPhone,
  initialEmail,
  initialWhatsapp,
  initialInstagram,
  onSaved,
}: ContactFormProps) {
  const t = useTranslations("profileEdit");
  const csrfToken = useCsrfToken();
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [instagram, setInstagram] = useState(initialInstagram);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken || whatsapp.trim().length < 6) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/provider/profile/contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({
        phone: phone || undefined,
        email: email || undefined,
        whatsapp,
        instagram: instagram || undefined,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    setSaved(true);
    onSaved?.();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 p-5">
      <h2 className="font-serif text-lg font-medium text-ink2">{t("contactTitle")}</h2>
      <p className="text-xs text-ink2-faint">{t("contactHint")}</p>
      <FieldGroup>
        <Label htmlFor="whatsapp">{t("whatsappLabel")}</Label>
        <TextInput
          id="whatsapp"
          type="tel"
          required
          minLength={6}
          maxLength={64}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <p className="text-xs text-ink2-faint">{t("whatsappHint")}</p>
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="instagram">{t("instagramLabel")}</Label>
        <TextInput id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <TextInput id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="contactEmail">{t("contactEmailLabel")}</Label>
        <TextInput id="contactEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FieldGroup>
      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">{t("saved")}</p>}
      <Button type="submit" disabled={submitting || !csrfToken || whatsapp.trim().length < 6} className="self-start">
        {t("save")}
      </Button>
    </Card>
  );
}
