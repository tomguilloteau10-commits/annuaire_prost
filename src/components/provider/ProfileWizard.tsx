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
  /** Étape ouverte à l'arrivée (lien direct depuis la checklist du tableau de bord). */
  initialStep?: string;
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
 *
 * En modification (profil existant, formulaire pré-rempli), chaque
 * "Enregistrer et continuer" enregistre immédiatement : on peut arriver
 * directement sur une étape (`initialStep`) et repartir sans tout refaire.
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
  initialStep,
}: ProfileWizardProps) {
  const t = useTranslations("profileEdit");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const [profileExists, setProfileExists] = useState(initialValues !== null);
  const [stepIndex, setStepIndex] = useState(() => {
    const requested = STEP_IDS.indexOf(initialStep as StepId);
    const maxIndex = initialValues !== null ? STEP_IDS.length - 1 : 2;
    return requested >= 0 && requested <= maxIndex ? requested : 0;
  });

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
    setProfileExists(true);
    router.refresh();
    return true;
  }

  async function handleSaveAndContinue(nextIndex = 3) {
    if (languageCodes.length === 0) {
      setError(t("selectAtLeastOneLanguage"));
      return;
    }
    const ok = await saveCoreProfile();
    // Pas goToStep() : son verrou (maxUnlockedIndex) date d'avant la
    // création du profil et bloquerait le passage à l'étape Photos.
    if (ok) setStepIndex(nextIndex);
  }

  // Étapes 1 et 2 : simple passage à la suite à la création (le profil
  // n'est créé qu'à l'étape 3, quand tout est rempli) ; enregistrement
  // immédiat en modification.
  function handleNext(fromIndex: number) {
    if (profileExists) void handleSaveAndContinue(fromIndex + 1);
    else goToStep(fromIndex + 1);
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
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink2-muted">
          {t("wizard.progress", { current: stepIndex + 1, total: steps.length })} ·{" "}
          <span className="text-ink2">{steps[stepIndex]!.label}</span>
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

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

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            onClick={() => handleNext(0)}
            disabled={!isStepValid("identity") || submitting}
            size="lg"
            className="w-full sm:w-auto sm:self-start"
          >
            {profileExists ? t("wizard.saveAndContinue") : t("wizard.next")}
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
            <Button variant="secondary" onClick={() => goToStep(0)} size="lg">
              {t("wizard.back")}
            </Button>
            <Button
              onClick={() => handleNext(1)}
              disabled={!isStepValid("presentation") || submitting}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {profileExists ? t("wizard.saveAndContinue") : t("wizard.next")}
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
            <Button variant="secondary" onClick={() => goToStep(1)} size="lg">
              {t("wizard.back")}
            </Button>
            <Button
              onClick={() => handleSaveAndContinue()}
              disabled={submitting || !csrfToken}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {t("wizard.saveAndContinue")}
            </Button>
          </div>
        </Card>
      )}

      {step === "photos" && profileExists && (
        <div className="flex flex-col gap-4">
          <PhotoManager initialPhotos={initialPhotos} maxPhotos={maxPhotos} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goToStep(2)} size="lg">
              {t("wizard.back")}
            </Button>
            <Button onClick={() => goToStep(4)} size="lg" className="flex-1 sm:flex-none">
              {t("wizard.next")}
            </Button>
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
            onSaved={() => router.push("/provider/dashboard")}
          />
          <Button variant="secondary" onClick={() => goToStep(3)} size="lg" className="self-start">
            {t("wizard.back")}
          </Button>
        </div>
      )}

    </div>
  );
}
