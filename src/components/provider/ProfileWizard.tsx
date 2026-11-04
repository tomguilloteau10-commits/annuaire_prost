"use client";
import { useCallback, useState } from "react";
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
  CLIENTELE,
  EYE_COLORS,
  HAIR_COLORS,
  HEIGHT_MAX_CM,
  HEIGHT_MIN_CM,
  ORIGINS,
  PAYMENT_METHODS,
  RATE_FIELDS,
  RATE_MAX_CHF,
  TIME_SLOTS,
  TRAVEL_RADII_KM,
  WEEK_DAYS,
  type RateField,
} from "@/modules/profiles/attributes";
import type { ProfileDetailsInput } from "@/modules/profiles/types";
import { PROFILE_DONE_PATH } from "@/lib/spaces";
import { sendRequest } from "@/lib/send-request";

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
export interface SalonOption {
  slug: string;
  name: string;
  city: string;
}

export interface ProfileWizardProps {
  locale: string;
  categories: CategoryOption[];
  services: ServiceOption[];
  languages: LanguageOption[];
  cities: CityOption[];
  salons: SalonOption[];
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
  initialContact: {
    phone: string;
    email: string;
    whatsapp: string;
    instagram: string;
  };
  initialPhotos: PhotoItem[];
  maxPhotos: number;
  /** Taille maximale d'une photo, en octets. */
  maxPhotoBytes: number;
  initialProfileStatus?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
  /** Étape ouverte à l'arrivée (lien direct depuis la checklist du tableau de bord). */
  initialStep?: string;
}

type FieldErrors = Partial<Record<string, string>>;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const STEP_IDS = ["presentation", "traits", "services", "availability", "photos", "contact"] as const;
type StepId = (typeof STEP_IDS)[number];
/** Étapes enregistrées par PUT /api/provider/profile (avant Photos). */
const LAST_CORE_INDEX = STEP_IDS.indexOf("availability");
const PHOTOS_INDEX = STEP_IDS.indexOf("photos");
/** Anciens noms d'étapes (liens déjà envoyés, favoris). */
const STEP_ALIASES: Record<string, StepId> = {
  identity: "presentation",
  appearance: "traits",
  rates: "services",
};

const CHIP = "cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors";
const CHIP_ON = "border-accent bg-accent text-accent-foreground";
const CHIP_OFF = "border-hairline2 text-ink2-muted hover:border-accent/60";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
      {children}
    </button>
  );
}

function ChipGroup({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-ink2-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <p className="text-xs text-ink2-faint">{hint}</p>}
    </fieldset>
  );
}

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
    <ChipGroup legend={legend}>
      {options.map((option) => (
        <Chip key={option} on={value === option} onClick={() => onChange(value === option ? null : option)}>
          {labelFor(option)}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** Oui / Non / (rien) pour un champ booléen facultatif. */
function YesNoChips({
  legend,
  value,
  onChange,
  yes,
  no,
}: {
  legend: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  yes: string;
  no: string;
}) {
  return (
    <ChipGroup legend={legend}>
      <Chip on={value === true} onClick={() => onChange(value === true ? null : true)}>
        {yes}
      </Chip>
      <Chip on={value === false} onClick={() => onChange(value === false ? null : false)}>
        {no}
      </Chip>
    </ChipGroup>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-lg font-medium text-ink2">{children}</h3>;
}

function toInt(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function isOptionalIntInRange(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

/** Message d'erreur sous un champ, relié au champ pour les lecteurs d'écran. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * Parcours prestataire en 6 étapes, une à la fois : Présentation (le seul
 * minimum obligatoire : nom, âge, ville, catégorie, langues, description),
 * Caractéristiques, Prestations & tarifs, Disponibilité (entièrement
 * facultatives), Photos (au moins une), Contact (WhatsApp obligatoire).
 *
 * Chaque "Suivant" vérifie l'étape (message clair sous chaque champ à
 * corriger, jamais un bouton grisé sans explication) puis enregistre : le
 * profil est créé dès l'étape 1, rien n'est perdu si la prestataire
 * s'arrête en route. À la fin, le profil est envoyé à l'équipe s'il ne
 * l'était pas déjà, puis un écran de confirmation s'affiche.
 */
export function ProfileWizard({
  locale,
  categories,
  services,
  languages,
  cities,
  salons,
  initialValues,
  initialContact,
  initialPhotos,
  maxPhotos,
  maxPhotoBytes,
  initialProfileStatus,
  initialStep,
}: ProfileWizardProps) {
  const t = useTranslations("profileEdit");
  const ta = useTranslations("attributes");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  const [profileExists, setProfileExists] = useState(initialValues !== null);
  const [stepIndex, setStepIndex] = useState(() => {
    const requestedId = initialStep ? (STEP_ALIASES[initialStep] ?? initialStep) : undefined;
    const requested = STEP_IDS.indexOf(requestedId as StepId);
    const maxIndex = initialValues !== null ? STEP_IDS.length - 1 : LAST_CORE_INDEX;
    return requested >= 0 && requested <= maxIndex ? requested : 0;
  });

  // Présentation (obligatoire)
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [age, setAge] = useState(initialValues?.age ? String(initialValues.age) : "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  // À la création, aucune ville ni catégorie présélectionnée : un choix
  // conscient plutôt qu'une valeur par défaut acceptée sans la voir.
  const [citySlug, setCitySlug] = useState(initialValues?.citySlug ?? "");
  const [categoryKey, setCategoryKey] = useState(initialValues?.categoryKey ?? "");
  const [languageCodes, setLanguageCodes] = useState<string[]>(initialValues?.languageCodes ?? []);

  // Tout le reste est facultatif.
  const d = initialValues?.details;
  const [heightCm, setHeightCm] = useState(d?.heightCm ? String(d.heightCm) : "");
  const [bodyType, setBodyType] = useState<string | null>(d?.bodyType ?? null);
  const [hairColor, setHairColor] = useState<string | null>(d?.hairColor ?? null);
  const [eyeColor, setEyeColor] = useState<string | null>(d?.eyeColor ?? null);
  const [tattoos, setTattoos] = useState<boolean | null>(d?.tattoos ?? null);
  const [piercings, setPiercings] = useState<boolean | null>(d?.piercings ?? null);
  const [origin, setOrigin] = useState(d?.origin ?? "");

  const [receives, setReceives] = useState(d?.receives ?? false);
  const [travels, setTravels] = useState(d?.travels ?? false);
  const [travelRadiusKm, setTravelRadiusKm] = useState(d?.travelRadiusKm ? String(d.travelRadiusKm) : "");
  const [clientele, setClientele] = useState<string[]>(d?.clientele ?? []);
  const [serviceKeys, setServiceKeys] = useState<string[]>(initialValues?.serviceKeys ?? []);
  const [rates, setRates] = useState<Record<RateField, string>>(() => {
    const entries = RATE_FIELDS.map((field) => [field, d?.[field]?.toString() ?? ""]);
    return Object.fromEntries(entries) as Record<RateField, string>;
  });
  const [paymentMethods, setPaymentMethods] = useState<string[]>(d?.paymentMethods ?? []);
  const [salonSlug, setSalonSlug] = useState(d?.salonSlug ?? "");

  const [availableDays, setAvailableDays] = useState<string[]>(d?.availableDays ?? []);
  const [availableFrom, setAvailableFrom] = useState(d?.availableFrom ?? "");
  const [availableTo, setAvailableTo] = useState(d?.availableTo ?? "");

  const [profileStatus, setProfileStatus] = useState(initialProfileStatus);
  const [usablePhotoCount, setUsablePhotoCount] = useState(
    initialPhotos.filter((p) => p.status !== "REJECTED").length,
  );
  const onPhotosChange = useCallback((count: number) => setUsablePhotoCount(count), []);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEP_IDS[stepIndex]!;
  // Photos et Contact demandent un profil déjà enregistré (étape 1 validée).
  const maxUnlockedIndex = profileExists ? STEP_IDS.length - 1 : 0;

  /** Erreurs de l'étape, champ par champ (objet vide = étape valide). */
  function validateStep(id: StepId): FieldErrors {
    const errors: FieldErrors = {};
    if (id === "presentation") {
      const ageNum = Number(age);
      if (displayName.trim().length < 2) errors.displayName = t("errors.displayName");
      if (!age.trim()) errors.age = t("errors.ageRequired");
      else if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 99) errors.age = t("errors.ageRange");
      if (!citySlug) errors.city = t("errors.city");
      if (!categoryKey) errors.category = t("errors.category");
      if (languageCodes.length === 0) errors.languages = t("errors.languages");
      if (description.trim().length < 20) {
        errors.description = t("errors.description", {
          missing: 20 - description.trim().length,
        });
      }
    }
    if (id === "traits" && !isOptionalIntInRange(heightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM)) {
      errors.heightCm = t("errors.height", {
        min: HEIGHT_MIN_CM,
        max: HEIGHT_MAX_CM,
      });
    }
    if (id === "services") {
      for (const field of RATE_FIELDS) {
        if (!isOptionalIntInRange(rates[field], 0, RATE_MAX_CHF)) errors[field] = t("errors.rate");
      }
    }
    if (id === "availability" && (availableFrom === "") !== (availableTo === "")) {
      errors[availableFrom ? "availableTo" : "availableFrom"] = t("hoursIncomplete");
    }
    if (id === "photos" && usablePhotoCount === 0) errors.photos = t("errors.photos");
    return errors;
  }

  /** Affiche les erreurs et place le curseur sur le premier champ à corriger. */
  function showErrors(errors: FieldErrors): boolean {
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (!first) return false;
    const element = document.getElementById(first);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
    return true;
  }

  // Une fois les erreurs affichées, elles suivent la saisie : un champ
  // corrigé perd son message aussitôt, sans attendre le prochain "Suivant".
  const shownErrors: FieldErrors = {};
  if (Object.keys(fieldErrors).length > 0) {
    const current = validateStep(step);
    for (const key of Object.keys(fieldErrors)) if (current[key]) shownErrors[key] = current[key];
  }

  const fieldProps = (id: string) => ({
    id,
    "aria-invalid": shownErrors[id] ? true : undefined,
    "aria-describedby": shownErrors[id] ? `${id}-error` : undefined,
  });

  function showStep(index: number) {
    setError(null);
    setFieldErrors({});
    setStepIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCoreProfile(): Promise<boolean> {
    if (!csrfToken) return false;
    setError(null);
    setSubmitting(true);

    const details: ProfileDetailsInput = {
      heightCm: toInt(heightCm),
      bodyType,
      hairColor,
      eyeColor,
      tattoos,
      piercings,
      origin: origin || null,
      receives,
      travels,
      travelRadiusKm: travels ? toInt(travelRadiusKm) : null,
      clientele,
      rate30Min: toInt(rates.rate30Min),
      rate1Hour: toInt(rates.rate1Hour),
      rate2Hours: toInt(rates.rate2Hours),
      rateNight: toInt(rates.rateNight),
      paymentMethods,
      salonSlug: salonSlug || null,
      availableDays,
      availableFrom: availableFrom || null,
      availableTo: availableTo || null,
    };

    const result = await sendRequest<{ status: typeof profileStatus }>("/api/provider/profile", {
      method: "PUT",
      csrfToken,
      json: {
        displayName,
        age: Number(age),
        description,
        citySlug,
        categoryKey,
        languageCodes,
        serviceKeys,
        details,
      },
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.status === 0
          ? t("networkError")
          : result.error === "invalid_input"
            ? t("invalidFieldsError")
            : t("saveError"),
      );
      return false;
    }
    setProfileStatus(result.data.status);
    setProfileExists(true);
    return true;
  }

  /**
   * Quitter l'étape courante (Suivant, Précédent ou pastille d'étape) :
   * elle est d'abord vérifiée, puis enregistrée si c'est une étape du
   * profil. En cas d'erreur, on reste sur place avec les messages.
   */
  async function navigate(target: number) {
    if (target === stepIndex || submitting) return;
    const errors = validateStep(step);
    // La photo n'est exigée que pour avancer : revenir en arrière reste libre.
    if (target < stepIndex) delete errors.photos;
    if (showErrors(errors)) return;
    if (stepIndex <= LAST_CORE_INDEX) {
      const ok = await saveCoreProfile();
      if (!ok) return;
    }
    showStep(target);
  }

  /** Fin du parcours : envoi à l'équipe si besoin, puis écran de confirmation. */
  async function finish() {
    if (csrfToken && (profileStatus === "DRAFT" || profileStatus === "REJECTED")) {
      // Si un élément manque encore (vérification d'âge…), l'envoi est
      // refusé : l'écran de confirmation dit alors exactement quoi faire.
      await sendRequest("/api/provider/profile/submit", {
        method: "POST",
        csrfToken,
      });
    }
    router.push(PROFILE_DONE_PATH);
  }

  function stepButtons(index: number) {
    const isLast = index === STEP_IDS.length - 1;
    if (isLast) return null;
    return (
      <>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="secondary" onClick={() => navigate(index - 1)} disabled={submitting} size="lg">
              {t("wizard.back")}
            </Button>
          )}
          <Button
            onClick={() => navigate(index + 1)}
            disabled={submitting || !csrfToken}
            size="lg"
            className={index > 0 ? "flex-1 sm:flex-none" : "w-full sm:w-auto"}
          >
            {submitting ? t("saving") : t("wizard.next")}
          </Button>
        </div>
      </>
    );
  }

  const stepIntro = <p className="text-sm text-ink2-muted">{t(`wizard.intro.${step}`)}</p>;

  const steps: { id: StepId; label: string }[] = [
    { id: "presentation", label: t("wizard.stepPresentation") },
    { id: "traits", label: t("wizard.stepTraits") },
    { id: "services", label: t("wizard.stepServices") },
    { id: "availability", label: t("wizard.stepAvailability") },
    { id: "photos", label: t("wizard.stepPhotos") },
    { id: "contact", label: t("wizard.stepContact") },
  ];

  const timeOptions = (
    <>
      <option value="">—</option>
      {TIME_SLOTS.map((slot) => (
        <option key={slot} value={slot}>
          {slot}
        </option>
      ))}
    </>
  );

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink2-muted">
          {t("wizard.progress", {
            current: stepIndex + 1,
            total: steps.length,
          })}{" "}
          · <span className="text-ink2">{steps[stepIndex]!.label}</span>
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
            onClick={() => navigate(index)}
            disabled={index > maxUnlockedIndex || submitting}
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

      {step === "presentation" && (
        <Card className="flex flex-col gap-5 p-5">
          {stepIntro}
          <FieldGroup>
            <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
            <TextInput
              {...fieldProps("displayName")}
              autoComplete="nickname"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-ink2-faint">{t("displayNameHint")}</p>
            <FieldError id="displayName" message={shownErrors.displayName} />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="age">{t("ageLabel")}</Label>
            <TextInput
              {...fieldProps("age")}
              type="number"
              inputMode="numeric"
              min={18}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-24"
            />
            <FieldError id="age" message={shownErrors.age} />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldGroup>
              <Label htmlFor="city">{t("cityLabel")}</Label>
              <Select {...fieldProps("city")} value={citySlug} onChange={(e) => setCitySlug(e.target.value)}>
                <option value="" disabled>
                  {t("cityPlaceholder")}
                </option>
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
              <FieldError id="city" message={shownErrors.city} />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="category">{t("categoryLabel")}</Label>
              <Select
                {...fieldProps("category")}
                value={categoryKey}
                onChange={(e) => setCategoryKey(e.target.value)}
              >
                <option value="" disabled>
                  {t("categoryPlaceholder")}
                </option>
                {categories.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getLocalizedLabel(category.label, locale)}
                  </option>
                ))}
              </Select>
              <FieldError id="category" message={shownErrors.category} />
            </FieldGroup>
          </div>

          <div id="languages" tabIndex={-1} className="flex flex-col gap-2 outline-none">
            <ChipGroup legend={t("languagesLabel")}>
              {languages.map((language) => (
                <Chip
                  key={language.code}
                  on={languageCodes.includes(language.code)}
                  onClick={() => setLanguageCodes((prev) => toggle(prev, language.code))}
                >
                  {getLocalizedLabel(language.label, locale)}
                </Chip>
              ))}
            </ChipGroup>
            <FieldError id="languages" message={shownErrors.languages} />
          </div>

          <FieldGroup>
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <TextArea
              {...fieldProps("description")}
              maxLength={4000}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-ink2-faint">
              {t("descriptionHint")}{" "}
              <span className={description.trim().length >= 20 ? "text-success" : ""}>
                ({t("descriptionCount", { count: description.trim().length })})
              </span>
            </p>
            <FieldError id="description" message={shownErrors.description} />
          </FieldGroup>

          {stepButtons(0)}
        </Card>
      )}

      {step === "traits" && (
        <Card className="flex flex-col gap-6 p-5">
          {stepIntro}
          <FieldGroup>
            <Label htmlFor="heightCm">{t("heightLabel")}</Label>
            <TextInput
              {...fieldProps("heightCm")}
              type="number"
              inputMode="numeric"
              min={HEIGHT_MIN_CM}
              max={HEIGHT_MAX_CM}
              placeholder="165"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-32"
            />
            <FieldError id="heightCm" message={shownErrors.heightCm} />
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <YesNoChips
              legend={t("tattoosLabel")}
              value={tattoos}
              onChange={setTattoos}
              yes={t("yes")}
              no={t("no")}
            />
            <YesNoChips
              legend={t("piercingsLabel")}
              value={piercings}
              onChange={setPiercings}
              yes={t("yes")}
              no={t("no")}
            />
          </div>
          <FieldGroup>
            <Label htmlFor="origin">{t("originLabel")}</Label>
            <Select id="origin" fit value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">{t("notSpecified")}</option>
              {ORIGINS.map((o) => (
                <option key={o} value={o}>
                  {ta(`origin.${o}`)}
                </option>
              ))}
            </Select>
          </FieldGroup>
          {stepButtons(1)}
        </Card>
      )}

      {step === "services" && (
        <Card className="flex flex-col gap-6 p-5">
          {stepIntro}

          <SectionTitle>{t("logisticsTitle")}</SectionTitle>
          <ChipGroup legend={t("meetingLabel")}>
            <Chip on={receives} onClick={() => setReceives((v) => !v)}>
              {t("receivesLabel")}
            </Chip>
            <Chip on={travels} onClick={() => setTravels((v) => !v)}>
              {t("travelsLabel")}
            </Chip>
          </ChipGroup>
          {travels && (
            <FieldGroup>
              <Label htmlFor="travelRadiusKm">{t("travelRadiusLabel")}</Label>
              <Select
                id="travelRadiusKm"
                fit
                value={travelRadiusKm}
                onChange={(e) => setTravelRadiusKm(e.target.value)}
              >
                <option value="">{t("notSpecified")}</option>
                {TRAVEL_RADII_KM.map((km) => (
                  <option key={km} value={km}>
                    {t("travelRadiusOption", { km })}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-ink2-faint">{t("travelRadiusHint")}</p>
            </FieldGroup>
          )}
          <ChipGroup legend={t("clienteleLabel")}>
            {CLIENTELE.map((c) => (
              <Chip key={c} on={clientele.includes(c)} onClick={() => setClientele((prev) => toggle(prev, c))}>
                {ta(`clientele.${c}`)}
              </Chip>
            ))}
          </ChipGroup>
          {services.length > 0 && (
            <ChipGroup legend={t("servicesLabel")}>
              {services.map((service) => (
                <Chip
                  key={service.key}
                  on={serviceKeys.includes(service.key)}
                  onClick={() => setServiceKeys((prev) => toggle(prev, service.key))}
                >
                  {getLocalizedLabel(service.label, locale)}
                </Chip>
              ))}
            </ChipGroup>
          )}
          {salons.length > 0 && (
            <FieldGroup>
              <Label htmlFor="salonSlug">{t("salonLabel")}</Label>
              <Select id="salonSlug" fit value={salonSlug} onChange={(e) => setSalonSlug(e.target.value)}>
                <option value="">{t("salonNone")}</option>
                {salons.map((salon) => (
                  <option key={salon.slug} value={salon.slug}>
                    {salon.name} — {salon.city}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          )}

          <SectionTitle>{t("ratesTitle")}</SectionTitle>
          <p className="text-sm text-ink2-muted">{t("ratesHint")}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {RATE_FIELDS.map((field) => (
              <FieldGroup key={field}>
                <Label htmlFor={field}>{t(`rates.${field}`)}</Label>
                <div className="flex items-center gap-2">
                  <TextInput
                    {...fieldProps(field)}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={RATE_MAX_CHF}
                    value={rates[field]}
                    onChange={(e) => setRates((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                  <span className="text-sm text-ink2-muted">CHF</span>
                </div>
                <FieldError id={field} message={shownErrors[field]} />
              </FieldGroup>
            ))}
          </div>
          <ChipGroup legend={t("paymentLabel")} hint={t("paymentHint")}>
            {PAYMENT_METHODS.map((m) => (
              <Chip
                key={m}
                on={paymentMethods.includes(m)}
                onClick={() => setPaymentMethods((prev) => toggle(prev, m))}
              >
                {ta(`payment.${m}`)}
              </Chip>
            ))}
          </ChipGroup>

          {stepButtons(2)}
        </Card>
      )}

      {step === "availability" && (
        <Card className="flex flex-col gap-6 p-5">
          {stepIntro}
          <ChipGroup legend={t("daysLabel")}>
            {WEEK_DAYS.map((day) => (
              <Chip
                key={day}
                on={availableDays.includes(day)}
                onClick={() => setAvailableDays((prev) => toggle(prev, day))}
              >
                {ta(`days.${day}`)}
              </Chip>
            ))}
          </ChipGroup>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-ink2-muted">{t("hoursLabel")}</legend>
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <FieldGroup>
                <Label htmlFor="availableFrom">{t("hoursFrom")}</Label>
                <Select
                  {...fieldProps("availableFrom")}
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                >
                  {timeOptions}
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="availableTo">{t("hoursTo")}</Label>
                <Select
                  {...fieldProps("availableTo")}
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                >
                  {timeOptions}
                </Select>
              </FieldGroup>
            </div>
            <p className="text-xs text-ink2-faint">{t("hoursHint")}</p>
            <FieldError id="availableFrom" message={shownErrors.availableFrom} />
            <FieldError id="availableTo" message={shownErrors.availableTo} />
          </fieldset>

          {stepButtons(LAST_CORE_INDEX)}
        </Card>
      )}

      {step === "photos" && profileExists && (
        <div className="flex flex-col gap-4">
          {stepIntro}
          <PhotoManager
            initialPhotos={initialPhotos}
            maxPhotos={maxPhotos}
            maxBytes={maxPhotoBytes}
            onPhotosChange={onPhotosChange}
          />
          <div id="photos" tabIndex={-1} className="outline-none">
            <FieldError id="photos" message={shownErrors.photos} />
          </div>
          {stepButtons(PHOTOS_INDEX)}
        </div>
      )}

      {step === "contact" && profileExists && (
        <div className="flex flex-col gap-4">
          {stepIntro}
          <ContactForm
            initialPhone={initialContact.phone}
            initialEmail={initialContact.email}
            initialWhatsapp={initialContact.whatsapp}
            initialInstagram={initialContact.instagram}
            submitLabel={
              profileStatus === "DRAFT" || profileStatus === "REJECTED"
                ? t("wizard.finishAndSend")
                : t("wizard.finish")
            }
            secondaryAction={
              <Button variant="secondary" type="button" onClick={() => navigate(PHOTOS_INDEX)} size="lg">
                {t("wizard.back")}
              </Button>
            }
            onSaved={finish}
          />
        </div>
      )}
    </div>
  );
}
