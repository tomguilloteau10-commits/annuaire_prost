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
}

// Formulaire distinct de ProfileEditForm à dessein : le contact vit dans
// sa propre table côté serveur (ProfileContact) et sa propre route
// (/api/provider/profile/contact) — jamais mélangé au reste du profil,
// cohérent avec ENGINEERING_RULES.md §5.
export function ContactForm({ initialPhone, initialEmail }: ContactFormProps) {
  const t = useTranslations("profileEdit");
  const csrfToken = useCsrfToken();
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const response = await fetch("/api/provider/profile/contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ phone: phone || undefined, email: email || undefined }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError(t("saveError"));
      return;
    }
    setSaved(true);
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 p-5">
      <h2 className="font-serif text-lg font-medium text-ink2">{t("contactTitle")}</h2>
      <p className="text-xs text-ink2-faint">{t("contactHint")}</p>
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
      <Button type="submit" disabled={submitting || !csrfToken} className="self-start">
        {t("save")}
      </Button>
    </Card>
  );
}
