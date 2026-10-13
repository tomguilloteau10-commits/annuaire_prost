"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { groupCitiesByCanton } from "@/lib/group-cities";
import { FieldGroup, Label, TextInput, TextArea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoManager, type PhotoItem } from "@/components/provider/PhotoManager";
import { ContactForm } from "@/components/provider/ContactForm";
import { SubmitProfileButton } from "@/components/provider/SubmitProfileButton";

interface LabeledOption {
  label: unknown;
}

export interface CategoryOption extends LabeledOption {
  key: string;
}
export interface ServiceOption extends LabeledOption {
  key: string;
}
export interface LanguageOption extends LabeledOption {
  code: string;
}
export interface CityOption {
  slug: string;
  name: string;
  canton: string;
}

export interface ProfileWizardProps {
  locale: string;
  categories: CategoryOption[];
  services: ServiceOption[];
  languages: LanguageOption[];
  cities: CityOption[];
  initialValues: {
    displayName: string;
    age: number | null;
    description: string;
    citySlug: string;
    categoryKey: string;
    languageCodes: string[];
    serviceKeys: string[];
    onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  } | null;
  initialContact: { phone: string; email: string; whatsapp: string; instagram: string };
  initialPhotos: PhotoItem[];
  maxPhotos: number;
  /** Attestation complétée ET vérification 18+ validée — indépendant de l'existence du profil. */
  readyToSubmit: boolean;
  initialProfileStatus?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const STEP_IDS = ["identity", "presentation", "availability", "photos", "contact"] as const;
type StepId = (typeof STEP_IDS)[number];

/**
 * Parcours prestataire en 5 étapes : identité (nom/âge/ville/catégorie),
 * présentation (langues/description), services & disponibilité, photos,
 * contact. Les étapes 1 à 3 partagent un seul état et un seul appel réseau
 * (PUT /api/provider/profile, déclenché en quittant l'étape 3) : c'est ce
 * qui crée le profil DRAFT. Les étapes Photos et Contact exigent un profil
 * déjà créé (les deux API sous-jacentes le vérifient), donc elles restent
 * verrouillées tant que l'étape 3 n'a pas été validée au moins une fois.
 */
export function ProfileWizard({
  locale,
  categories,
  services,
  languages,
  cities,
  initialValues,
  initialContact,
  initialPhotos,
  maxPhotos,
  readyToSubmit,
  initialProfileStatus,
}: ProfileWizardProps) {
  const t = useTranslations("profileEdit");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const [profileExists, setProfileExists] = useState(initialValues !== null);
  const [profileStatus, setProfileStatus] = useState(initialProfileStatus);
  const [stepIndex, setStepIndex] = useState(0);

  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [age, setAge] = useState(initialValues?.age ? String(initialValues.age) : "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [citySlug, setCitySlug] = useState(initialValues?.citySlug ?? cities[0]?.slug ?? "");
  const [categoryKey, setCategoryKey] = useState(initialValues?.categoryKey ?? categories[0]?.key ?? "");
  const [languageCodes, setLanguageCodes] = useState<string[]>(initialValues?.languageCodes ?? []);
  const [serviceKeys, setServiceKeys] = useState<string[]>(initialValues?.serviceKeys ?? []);
  const [onlineStatus, setOnlineStatus] = useState(initialValues?.onlineStatus ?? "OFFLINE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEP_IDS[stepIndex]!;
  const maxUnlockedIndex = profileExists ? STEP_IDS.length - 1 : 2;
  const canSubmitNow = profileExists && readyToSubmit && (profileStatus === "DRAFT" || profileStatus === "REJECTED");

  function isStepValid(id: StepId): boolean {
    if (id === "identity") {
      const ageNum = Number(age);
      return (
        displayName.trim().length >= 2 &&
        Number.isInteger(ageNum) &&
        ageNum >= 18 &&
        ageNum <= 99 &&
        !!citySlug &&
        !!categoryKey
      );
    }
    if (id === "presentation") {
      return languageCodes.length > 0 && description.trim().length >= 20;
    }
    return true;
  }

  function goToStep(index: number) {
    if (index < 0 || index > maxUnlockedIndex) return;
    setError(null);
    setStepIndex(index);
  }

  async function saveCoreProfile(): Promise<boolean> {
    if (!csrfToken) return false;
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/provider/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({
        displayName,
        age: Number(age),
        description,
        citySlug,
        categoryKey,
        languageCodes,
        serviceKeys,
        onlineStatus,
      }),
    });

    setSubmitting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error === "invalid_input" ? t("invalidFieldsError") : t("saveError"));
      return false;
    }
    const data = (await response.json()) as { status: typeof profileStatus };
    setProfileExists(true);
    setProfileStatus(data.status);
    router.refresh();
    return true;
  }

  async function handleSaveAndContinue() {
    if (languageCodes.length === 0) {
      setError(t("selectAtLeastOneLanguage"));
      return;
    }
    const ok = await saveCoreProfile();
    if (ok) goToStep(3);
  }

  const steps: { id: StepId; label: string }[] = [
    { id: "identity", label: t("wizard.stepIdentity") },
    { id: "presentation", label: t("wizard.stepPresentation") },
    { id: "availability", label: t("wizard.stepAvailability") },
    { id: "photos", label: t("wizard.stepPhotos") },
    { id: "contact", label: t("wizard.stepContact") },
  ];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, index) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToStep(index)}
            disabled={index > maxUnlockedIndex}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              index === stepIndex
                ? "border-accent bg-accent text-accent-foreground"
                : "border-hairline2 text-ink2-muted hover:border-hairline2"
            }`}
          >
            {index + 1}. {s.label}
          </button>
        ))}
      </div>

      {step === "identity" && (
        <Card className="flex flex-col gap-5 p-5">
          <FieldGroup>
            <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
            <TextInput
              id="displayName"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="age">{t("ageLabel")}</Label>
            <TextInput
              id="age"
              type="number"
              required
              min={18}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-24"
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="city">{t("cityLabel")}</Label>
              <Select id="city" value={citySlug} onChange={(e) => setCitySlug(e.target.value)}>
                {groupCitiesByCanton(cities).map((group) => (
                  <optgroup key={group.canton} label={group.canton}>
                    {group.cities.map((city) => (
                      <option key={city.slug} value={city.slug}>
                        {city.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="category">{t("categoryLabel")}</Label>
              <Select id="category" value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
                {categories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getLocalizedLabel(category.label, locale)}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>

          <Button onClick={() => goToStep(1)} disabled={!isStepValid("identity")} className="self-start">
            {t("wizard.next")}
          </Button>
        </Card>
      )}

      {step === "presentation" && (
        <Card className="flex flex-col gap-5 p-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink2-muted">{t("languagesLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {languages.map((language) => (
                <label
                  key={language.code}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    languageCodes.includes(language.code)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-hairline2 text-ink2-muted hover:border-hairline2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={languageCodes.includes(language.code)}
                    onChange={() => setLanguageCodes((prev) => toggle(prev, language.code))}
                  />
                  {getLocalizedLabel(language.label, locale)}
                </label>
              ))}
            </div>
          </fieldset>

          <FieldGroup>
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <TextArea
              id="description"
              required
              minLength={20}
              maxLength={4000}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FieldGroup>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goToStep(0)}>
              {t("wizard.back")}
            </Button>
            <Button onClick={() => goToStep(2)} disabled={!isStepValid("presentation")}>
              {t("wizard.next")}
            </Button>
          </div>
        </Card>
      )}

      {step === "availability" && (
        <Card className="flex flex-col gap-5 p-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink2-muted">{t("servicesLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <label
                  key={service.key}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    serviceKeys.includes(service.key)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-hairline2 text-ink2-muted hover:border-hairline2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={serviceKeys.includes(service.key)}
                    onChange={() => setServiceKeys((prev) => toggle(prev, service.key))}
                  />
                  {getLocalizedLabel(service.label, locale)}
                </label>
              ))}
            </div>
          </fieldset>

          <FieldGroup>
            <Label htmlFor="onlineStatus">{t("onlineStatusLabel")}</Label>
            <Select
              id="onlineStatus"
              value={onlineStatus}
              onChange={(e) => setOnlineStatus(e.target.value as typeof onlineStatus)}
            >
              <option value="ONLINE">{t("onlineStatusOptions.ONLINE")}</option>
              <option value="AWAY">{t("onlineStatusOptions.AWAY")}</option>
              <option value="OFFLINE">{t("onlineStatusOptions.OFFLINE")}</option>
            </Select>
          </FieldGroup>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goToStep(1)}>
              {t("wizard.back")}
            </Button>
            <Button onClick={handleSaveAndContinue} disabled={submitting || !csrfToken}>
              {t("wizard.saveAndContinue")}
            </Button>
          </div>
        </Card>
      )}

      {step === "photos" && profileExists && (
        <div className="flex flex-col gap-4">
          <PhotoManager initialPhotos={initialPhotos} maxPhotos={maxPhotos} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goToStep(2)}>
              {t("wizard.back")}
            </Button>
            <Button onClick={() => goToStep(4)}>{t("wizard.next")}</Button>
          </div>
        </div>
      )}

      {step === "contact" && profileExists && (
        <div className="flex flex-col gap-4">
          <ContactForm
            initialPhone={initialContact.phone}
            initialEmail={initialContact.email}
            initialWhatsapp={initialContact.whatsapp}
            initialInstagram={initialContact.instagram}
          />
          <Button variant="secondary" onClick={() => goToStep(3)} className="self-start">
            {t("wizard.back")}
          </Button>
        </div>
      )}

      {canSubmitNow && (
        <Card className="flex flex-col gap-3 p-5">
          <p className="text-sm text-ink2-muted">{t("wizard.readyToSubmitHint")}</p>
          <SubmitProfileButton />
        </Card>
      )}
    </div>
  );
}
