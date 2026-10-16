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
  initialContact: { phone: string; email: string; whatsapp: string; instagram: string };
  initialPhotos: PhotoItem[];
  maxPhotos: number;
  /** Étape ouverte à l'arrivée (lien direct depuis la checklist du tableau de bord). */
  initialStep?: string;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const STEP_IDS = ["presentation", "traits", "services", "availability", "photos", "contact"] as const;
type StepId = (typeof STEP_IDS)[number];
/** Dernière étape enregistrée par PUT /api/provider/profile (avant Photos). */
const LAST_CORE_INDEX = STEP_IDS.indexOf("availability");
/** Anciens noms d'étapes (liens déjà envoyés, favoris). */
const STEP_ALIASES: Record<string, StepId> = { identity: "presentation", appearance: "traits", rates: "services" };

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

/**
 * Parcours prestataire en 6 étapes, une à la fois : Présentation (le seul
 * minimum obligatoire : nom, âge, ville, catégorie, langues, description),
 * Caractéristiques, Prestations & tarifs, Disponibilité (ces trois-là
 * entièrement facultatives), Photos, Contact. Les étapes 1 à 4 partagent un
 * seul état et un seul appel réseau (PUT /api/provider/profile, déclenché
 * en quittant Disponibilité) : c'est ce qui crée le profil DRAFT. Photos et
 * Contact exigent un profil déjà créé (les deux API le vérifient), donc
 * elles restent verrouillées jusque-là.
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
  salons,
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
    const requestedId = initialStep ? (STEP_ALIASES[initialStep] ?? initialStep) : undefined;
    const requested = STEP_IDS.indexOf(requestedId as StepId);
    const maxIndex = initialValues !== null ? STEP_IDS.length - 1 : LAST_CORE_INDEX;
    return requested >= 0 && requested <= maxIndex ? requested : 0;
  });

  // Présentation (obligatoire)
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
  const [age, setAge] = useState(initialValues?.age ? String(initialValues.age) : "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [citySlug, setCitySlug] = useState(initialValues?.citySlug ?? cities[0]?.slug ?? "");
  const [categoryKey, setCategoryKey] = useState(initialValues?.categoryKey ?? categories[0]?.key ?? "");
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

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = STEP_IDS[stepIndex]!;
  const maxUnlockedIndex = profileExists ? STEP_IDS.length - 1 : LAST_CORE_INDEX;

  function isStepValid(id: StepId): boolean {
    if (id === "presentation") {
      const ageNum = Number(age);
      return (
        displayName.trim().length >= 2 &&
        Number.isInteger(ageNum) &&
        ageNum >= 18 &&
        ageNum <= 99 &&
        !!citySlug &&
        !!categoryKey &&
        languageCodes.length > 0 &&
        description.trim().length >= 20
      );
    }
    if (id === "traits") return isOptionalIntInRange(heightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM);
    if (id === "services") return RATE_FIELDS.every((field) => isOptionalIntInRange(rates[field], 0, RATE_MAX_CHF));
    if (id === "availability") return (availableFrom === "") === (availableTo === "");
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
        details,
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

  async function handleSaveAndContinue(nextIndex: number) {
    if (languageCodes.length === 0) {
      setError(t("selectAtLeastOneLanguage"));
      return;
    }
    const ok = await saveCoreProfile();
    // Pas goToStep() : son verrou (maxUnlockedIndex) date d'avant la
    // création du profil et bloquerait le passage à l'étape Photos.
    if (ok) setStepIndex(nextIndex);
  }

  // À la création, le profil n'est enregistré qu'en quittant Disponibilité
  // (tout le minimum est alors rempli) ; en modification, à chaque étape.
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

      {step === "presentation" && (
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
              inputMode="numeric"
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
            <p className="text-xs text-ink2-faint">{t("descriptionHint")}</p>
          </FieldGroup>

          {coreStepButtons(0)}
        </Card>
      )}

      {step === "traits" && (
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <YesNoChips legend={t("tattoosLabel")} value={tattoos} onChange={setTattoos} yes={t("yes")} no={t("no")} />
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
          {coreStepButtons(1)}
        </Card>
      )}

      {step === "services" && (
        <Card className="flex flex-col gap-6 p-5">
          {optionalHint}

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
              <Select id="travelRadiusKm" fit value={travelRadiusKm} onChange={(e) => setTravelRadiusKm(e.target.value)}>
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
          <ChipGroup legend={t("paymentLabel")} hint={t("paymentHint")}>
            {PAYMENT_METHODS.map((m) => (
              <Chip key={m} on={paymentMethods.includes(m)} onClick={() => setPaymentMethods((prev) => toggle(prev, m))}>
                {ta(`payment.${m}`)}
              </Chip>
            ))}
          </ChipGroup>

          {coreStepButtons(2)}
        </Card>
      )}

      {step === "availability" && (
        <Card className="flex flex-col gap-6 p-5">
          {optionalHint}
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
                <Select id="availableFrom" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}>
                  {timeOptions}
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="availableTo">{t("hoursTo")}</Label>
                <Select id="availableTo" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)}>
                  {timeOptions}
                </Select>
              </FieldGroup>
            </div>
            <p className="text-xs text-ink2-faint">{t("hoursHint")}</p>
            {!isStepValid("availability") && <p className="text-sm text-warning">{t("hoursIncomplete")}</p>}
          </fieldset>

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
