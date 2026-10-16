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
import {
  BODY_TYPES,
  EYE_COLORS,
  HAIR_COLORS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  RATE_FIELDS,
  RATE_MAX_CHF,
  TIME_SLOTS,
  WEEK_DAYS,
  type RateField,
} from "@/modules/profiles/attributes";
import type { ProfileDetailsInput } from "@/modules/profiles/types";
import { DASHBOARD_PATH } from "@/lib/spaces";

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
    details: ProfileDetailsInput;
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

const STEP_IDS = ["identity", "presentation", "appearance", "availability", "rates", "photos", "contact"] as const;
type StepId = (typeof STEP_IDS)[number];
/** Dernière étape enregistrée par PUT /api/provider/profile (avant Photos). */
const LAST_CORE_INDEX = STEP_IDS.indexOf("rates");

const CHIP = "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors";
const CHIP_ON = "border-accent bg-accent text-accent-foreground";
const CHIP_OFF = "border-hairline2 text-ink2-muted hover:border-accent/60";

/** Puces à choix unique ; toucher la puce choisie la désélectionne (tout est facultatif). */
function ChoiceChips({
  legend,
  options,
  value,
  onChange,
  labelFor,
}: {
  legend: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
  labelFor: (option: string) => string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-ink2-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? null : option)}
            className={`${CHIP} ${value === option ? CHIP_ON : CHIP_OFF}`}
          >
            {labelFor(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function toInt(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function isOptionalIntInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

/**
 * Parcours prestataire en 7 étapes : identité (nom/âge/ville/catégorie),
 * présentation (langues/description), apparence, services & disponibilités,
 * tarifs (ces trois-là facultatives), photos, contact. Les étapes 1 à 5
 * partagent un seul état et un seul appel réseau (PUT /api/provider/profile,
 * déclenché en quittant l'étape Tarifs) : c'est ce qui crée le profil DRAFT.
 * Les étapes Photos et Contact exigent un profil déjà créé (les deux API
 * sous-jacentes le vérifient), donc elles restent verrouillées tant que
 * l'étape Tarifs n'a pas été validée au moins une fois.
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
  const ta = useTranslations("attributes");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const [profileExists, setProfileExists] = useState(initialValues !== null);
  const [stepIndex, setStepIndex] = useState(() => {
    const requested = STEP_IDS.indexOf(initialStep as StepId);
    const maxIndex = initialValues !== null ? STEP_IDS.length - 1 : LAST_CORE_INDEX;
    return requested >= 0 && requested <= maxIndex ? requested : 0;
  });

  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [age, setAge] = useState(initialValues?.age ? String(initialValues.age) : "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [citySlug, setCitySlug] = useState(initialValues?.citySlug ?? cities[0]?.slug ?? "");
  const [categoryKey, setCategoryKey] = useState(initialValues?.categoryKey ?? categories[0]?.key ?? "");
  const [languageCodes, setLanguageCodes] = useState<string[]>(initialValues?.languageCodes ?? []);
  const [serviceKeys, setServiceKeys] = useState<string[]>(initialValues?.serviceKeys ?? []);
  const initialDetails = initialValues?.details;
  const [heightCm, setHeightCm] = useState(initialDetails?.heightCm ? String(initialDetails.heightCm) : "");
  const [bodyType, setBodyType] = useState<string | null>(initialDetails?.bodyType ?? null);
  const [hairColor, setHairColor] = useState<string | null>(initialDetails?.hairColor ?? null);
  const [eyeColor, setEyeColor] = useState<string | null>(initialDetails?.eyeColor ?? null);
  const [rates, setRates] = useState<Record<RateField, string>>(() => {
    const entries = RATE_FIELDS.map((field) => [field, initialDetails?.[field]?.toString() ?? ""]);
    return Object.fromEntries(entries) as Record<RateField, string>;
  });
  const [availableDays, setAvailableDays] = useState<string[]>(initialDetails?.availableDays ?? []);
  const [availableFrom, setAvailableFrom] = useState(initialDetails?.availableFrom ?? "");
  const [availableTo, setAvailableTo] = useState(initialDetails?.availableTo ?? "");
  const [receives, setReceives] = useState(initialDetails?.receives ?? false);
  const [travels, setTravels] = useState(initialDetails?.travels ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEP_IDS[stepIndex]!;
  const maxUnlockedIndex = profileExists ? STEP_IDS.length - 1 : LAST_CORE_INDEX;

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
    if (id === "appearance") return isOptionalIntInRange(heightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM);
    if (id === "availability") return (availableFrom === "") === (availableTo === "");
    if (id === "rates") return RATE_FIELDS.every((field) => isOptionalIntInRange(rates[field], 0, RATE_MAX_CHF));
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
        details: {
          heightCm: toInt(heightCm),
          bodyType,
          hairColor,
          eyeColor,
          rate30Min: toInt(rates.rate30Min),
          rate1Hour: toInt(rates.rate1Hour),
          rate2Hours: toInt(rates.rate2Hours),
          rateNight: toInt(rates.rateNight),
          availableDays,
          availableFrom: availableFrom || null,
          availableTo: availableTo || null,
          receives,
          travels,
        } satisfies ProfileDetailsInput,
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

  async function handleSaveAndContinue(nextIndex = LAST_CORE_INDEX + 1) {
    if (languageCodes.length === 0) {
      setError(t("selectAtLeastOneLanguage"));
      return;
    }
    const ok = await saveCoreProfile();
    // Pas goToStep() : son verrou (maxUnlockedIndex) date d'avant la
    // création du profil et bloquerait le passage à l'étape Photos.
    if (ok) setStepIndex(nextIndex);
  }

  // Avant l'étape Tarifs : simple passage à la suite à la création (le
  // profil n'est créé qu'en quittant Tarifs, quand tout est rempli) ;
  // enregistrement immédiat en modification.
  function handleNext(fromIndex: number) {
    if (profileExists || fromIndex === LAST_CORE_INDEX) void handleSaveAndContinue(fromIndex + 1);
    else goToStep(fromIndex + 1);
  }

  function coreStepButtons(index: number) {
    const saves = profileExists || index === LAST_CORE_INDEX;
    return (
      <>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="secondary" onClick={() => goToStep(index - 1)} size="lg">
              {t("wizard.back")}
            </Button>
          )}
          <Button
            onClick={() => handleNext(index)}
            disabled={!isStepValid(STEP_IDS[index]!) || submitting || (saves && !csrfToken)}
            size="lg"
            className={index > 0 ? "flex-1 sm:flex-none" : "w-full sm:w-auto"}
          >
            {saves ? t("wizard.saveAndContinue") : t("wizard.next")}
          </Button>
        </div>
      </>
    );
  }

  const optionalHint = <p className="text-sm text-ink2-faint">{t("wizard.optionalHint")}</p>;

  const steps: { id: StepId; label: string }[] = [
    { id: "identity", label: t("wizard.stepIdentity") },
    { id: "presentation", label: t("wizard.stepPresentation") },
    { id: "appearance", label: t("wizard.stepAppearance") },
    { id: "availability", label: t("wizard.stepAvailability") },
    { id: "rates", label: t("wizard.stepRates") },
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

          {coreStepButtons(0)}
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

          {coreStepButtons(1)}
        </Card>
      )}

      {step === "appearance" && (
        <Card className="flex flex-col gap-6 p-5">
          {optionalHint}
          <FieldGroup>
            <Label htmlFor="heightCm">{t("heightLabel")}</Label>
            <TextInput
              id="heightCm"
              type="number"
              inputMode="numeric"
              min={HEIGHT_MIN_CM}
              max={HEIGHT_MAX_CM}
              placeholder="165"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-32"
            />
          </FieldGroup>
          <ChoiceChips
            legend={t("bodyTypeLabel")}
            options={BODY_TYPES}
            value={bodyType}
            onChange={setBodyType}
            labelFor={(o) => ta(`bodyType.${o}`)}
          />
          <ChoiceChips
            legend={t("hairLabel")}
            options={HAIR_COLORS}
            value={hairColor}
            onChange={setHairColor}
            labelFor={(o) => ta(`hairColor.${o}`)}
          />
          <ChoiceChips
            legend={t("eyesLabel")}
            options={EYE_COLORS}
            value={eyeColor}
            onChange={setEyeColor}
            labelFor={(o) => ta(`eyeColor.${o}`)}
          />
          {coreStepButtons(2)}
        </Card>
      )}

      {step === "availability" && (
        <Card className="flex flex-col gap-6 p-5">
          {optionalHint}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink2-muted">{t("meetingLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={receives}
                onClick={() => setReceives((v) => !v)}
                className={`${CHIP} ${receives ? CHIP_ON : CHIP_OFF}`}
              >
                {t("receivesLabel")}
              </button>
              <button
                type="button"
                aria-pressed={travels}
                onClick={() => setTravels((v) => !v)}
                className={`${CHIP} ${travels ? CHIP_ON : CHIP_OFF}`}
              >
                {t("travelsLabel")}
              </button>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink2-muted">{t("daysLabel")}</legend>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={availableDays.includes(day)}
                  onClick={() => setAvailableDays((prev) => toggle(prev, day))}
                  className={`${CHIP} ${availableDays.includes(day) ? CHIP_ON : CHIP_OFF}`}
                >
                  {ta(`days.${day}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink2-muted">{t("hoursLabel")}</legend>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="availableFrom">{t("hoursFrom")}</Label>
                <Select id="availableFrom" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}>
                  <option value="">—</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="availableTo">{t("hoursTo")}</Label>
                <Select id="availableTo" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)}>
                  <option value="">—</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </div>
            <p className="text-xs text-ink2-faint">{t("hoursHint")}</p>
            {!isStepValid("availability") && <p className="text-sm text-warning">{t("hoursIncomplete")}</p>}
          </fieldset>

          {services.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-ink2-muted">{t("servicesLabel")}</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <button
                    key={service.key}
                    type="button"
                    aria-pressed={serviceKeys.includes(service.key)}
                    onClick={() => setServiceKeys((prev) => toggle(prev, service.key))}
                    className={`${CHIP} ${serviceKeys.includes(service.key) ? CHIP_ON : CHIP_OFF}`}
                  >
                    {getLocalizedLabel(service.label, locale)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {coreStepButtons(3)}
        </Card>
      )}

      {step === "rates" && (
        <Card className="flex flex-col gap-5 p-5">
          <p className="text-sm text-ink2-muted">{t("ratesHint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {RATE_FIELDS.map((field) => (
              <FieldGroup key={field}>
                <Label htmlFor={field}>{t(`rates.${field}`)}</Label>
                <div className="flex items-center gap-2">
                  <TextInput
                    id={field}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={RATE_MAX_CHF}
                    value={rates[field]}
                    onChange={(e) => setRates((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                  <span className="text-sm text-ink2-muted">CHF</span>
                </div>
              </FieldGroup>
            ))}
          </div>
          {coreStepButtons(LAST_CORE_INDEX)}
        </Card>
      )}

      {step === "photos" && profileExists && (
        <div className="flex flex-col gap-4">
          <PhotoManager initialPhotos={initialPhotos} maxPhotos={maxPhotos} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => goToStep(STEP_IDS.indexOf("photos") - 1)} size="lg">
              {t("wizard.back")}
            </Button>
            <Button
              onClick={() => goToStep(STEP_IDS.indexOf("contact"))}
              size="lg"
              className="flex-1 sm:flex-none"
            >
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
            onSaved={() => router.push(DASHBOARD_PATH)}
          />
          <Button
            variant="secondary"
            onClick={() => goToStep(STEP_IDS.indexOf("photos"))}
            size="lg"
            className="self-start"
          >
            {t("wizard.back")}
          </Button>
        </div>
      )}
    </div>
  );
}
