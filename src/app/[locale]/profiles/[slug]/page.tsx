import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublicContactChannels, getPublishedProfileBySlug } from "@/modules/profiles/profile.service";
import { getPublicPhotoUrl } from "@/modules/media/media.service";
import { getLocalizedLabel } from "@/modules/taxonomies/types";
import { HEIGHT_TOP_CM, RATE_FIELDS, WEEK_DAYS, groupWeekDays } from "@/modules/profiles/attributes";
import { DEMO_SALONS } from "@/modules/showcase/demo-salons";
import { ProfileGallery } from "@/components/public/ProfileGallery";
import { ContactBlock } from "@/components/public/ContactBlock";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

const STATUS_BADGE: Record<"ONLINE" | "AWAY" | "OFFLINE", BadgeVariant> = {
  ONLINE: "successOnImage",
  AWAY: "warning",
  OFFLINE: "neutral",
};

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-accent/25 px-3 py-1 text-sm text-ink2/90">{children}</span>;
}

/** Titre de section : filet doré + titre serif. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 font-serif text-[1.35rem] font-normal tracking-tight text-ink2">
      <span aria-hidden className="h-px w-6 bg-gradient-to-r from-accent to-accent/0" />
      {children}
    </h2>
  );
}

/** Panneau d'une section de la fiche. */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Reveal>
      <section
        className={`flex flex-col gap-4 rounded-xl2 border border-hairline bg-gradient-to-b from-surface-raised/50 to-surface/30 p-5 shadow-card sm:p-6 ${className}`}
      >
        {children}
      </section>
    </Reveal>
  );
}

/** Ligne "libellé : valeur" d'une liste de définitions. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink2-faint">{label}</dt>
      <dd className="min-w-0 text-ink2">{children}</dd>
    </div>
  );
}

/** Tuile « libellé / valeur » (ex. Cheveux / Châtains) : sûre dans toutes les langues. */
function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-ink-soft/50 px-3.5 py-3">
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink2-faint">{label}</span>
      <span className="font-serif text-[17px] leading-tight text-ink2">{value}</span>
    </div>
  );
}

// Page publique, sans connexion. Aucune donnée de contact n'est lue ici :
// getPublishedProfileBySlug() ne sélectionne pas ProfileContact, et le
// contact n'arrive qu'au clic dans ContactBlock (ENGINEERING_RULES.md §5).
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const ta = await getTranslations("attributes");

  const profile = await getPublishedProfileBySlug(slug);
  if (!profile) notFound();

  const photoUrls = (await Promise.all(profile.media.map((media) => getPublicPhotoUrl(media.id)))).filter(
    (url): url is string => url !== null,
  );

  const chf = new Intl.NumberFormat(`${locale}-CH`, {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  });
  const rates = RATE_FIELDS.flatMap((field) => {
    const amount = profile[field];
    return amount === null ? [] : [{ field, amount }];
  });
  const days =
    profile.availableDays.length === WEEK_DAYS.length
      ? ta("days.all")
      : groupWeekDays(profile.availableDays)
          .map(([from, to]) => (from === to ? ta(`days.${from}`) : `${ta(`days.${from}`)} – ${ta(`days.${to}`)}`))
          .join(", ");
  const hours =
    profile.availableFrom && profile.availableTo ? `${profile.availableFrom} – ${profile.availableTo}` : null;

  const meeting = [
    profile.receives && t("receives"),
    profile.travels &&
      (profile.travelRadiusKm
        ? t("travelsWithin", { km: profile.travelRadiusKm, city: profile.city.name })
        : t("travels")),
  ].filter((m): m is string => !!m);
  const clientele = profile.clientele.map((c) => ta(`clientele.${c}`));
  const payments = profile.paymentMethods.map((m) => ta(`payment.${m}`));
  // Canaux seulement (WhatsApp, e-mail…) : la coordonnée n'arrive qu'au clic.
  const contactChannels = (await getPublicContactChannels(profile.id)).map((m) => ta(`contactMethod.${m}`));
  const salon = profile.salonSlug ? DEMO_SALONS.find((s) => s.slug === profile.salonSlug) : undefined;
  const hasServices =
    meeting.length > 0 ||
    clientele.length > 0 ||
    contactChannels.length > 0 ||
    profile.services.length > 0 ||
    !!salon;
  const services = [...profile.services]
    .map((s) => ({ key: s.service.key, label: getLocalizedLabel(s.service.label, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const yesNo = (value: boolean) => (value ? t("yes") : t("no"));

  const traits = [
    profile.heightCm && {
      label: t("traits.height"),
      value:
        profile.heightCm >= HEIGHT_TOP_CM
          ? t("traits.heightPlus", {
              m: (HEIGHT_TOP_CM / 100).toLocaleString(locale, { minimumFractionDigits: 2 }),
            })
          : t("traits.heightMeters", {
              m: (profile.heightCm / 100).toLocaleString(locale, { minimumFractionDigits: 2 }),
            }),
    },
    profile.bodyType && { label: t("traits.bodyType"), value: ta(`bodyType.${profile.bodyType}`) },
    profile.hairColor && { label: t("traits.hair"), value: ta(`hairColor.${profile.hairColor}`) },
    profile.eyeColor && { label: t("traits.eyes"), value: ta(`eyeColor.${profile.eyeColor}`) },
    profile.tattoos !== null && { label: t("traits.tattoos"), value: yesNo(profile.tattoos) },
    profile.piercings !== null && { label: t("traits.piercings"), value: yesNo(profile.piercings) },
    profile.origin && { label: t("traits.origin"), value: ta(`origin.${profile.origin}`) },
    profile.cupSize && { label: t("traits.cup"), value: ta(`cupSize.${profile.cupSize}`) },
    profile.pubicHair && { label: t("traits.pubicHair"), value: ta(`pubicHair.${profile.pubicHair}`) },
  ].filter((trait): trait is { label: string; value: string } => !!trait);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Link href="/" className="self-start text-sm text-ink2-muted transition-colors hover:text-accent">
        ← {t("backToDirectory")}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <ProfileGallery photos={photoUrls} className="md:col-start-1 md:row-start-1" />

        {/* Infos + contact : sous la galerie sur mobile, colonne de droite
            (collante) sur desktop — le contact reste visible en scrollant. */}
        <aside className="flex flex-col gap-6 md:sticky md:top-36 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
          <div className="flex flex-col gap-3.5">
            <p className="eyebrow">{getLocalizedLabel(profile.category.label, locale)}</p>
            <h1 className="font-serif text-4xl font-light leading-[1.05] tracking-tight text-ink2 sm:text-5xl">
              {profile.displayName}
              {profile.age && (
                <span className="font-sans text-2xl font-extralight text-ink2/60 sm:text-3xl">
                  , {t("ageYears", { age: profile.age })}
                </span>
              )}
            </h1>
            <p className="flex items-center gap-1.5 text-ink2-muted">
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4 text-accent/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
                <circle cx="10" cy="8" r="2" />
              </svg>
              {profile.city.name} ({profile.city.canton})
            </p>
            {profile.rateFrom !== null && (
              <p className="text-gold font-serif text-2xl">
                {t("rateFrom", { price: chf.format(profile.rateFrom) })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="successOnImage" className="border border-hairline">
                ✓ {t("verifiedBadge")}
              </Badge>
              <Badge variant={STATUS_BADGE[profile.onlineStatus]} className="border border-hairline" dot>
                {t(`onlineStatus.${profile.onlineStatus}`)}
              </Badge>
            </div>
          </div>

          <ContactBlock slug={profile.slug} />
        </aside>

        <div className="flex flex-col gap-5 md:col-start-1 md:row-start-2">
          <Panel>
            <SectionTitle>{t("aboutTitle")}</SectionTitle>
            <p className="whitespace-pre-wrap text-[15.5px] leading-[1.75] text-ink2/80">{profile.description}</p>
          </Panel>

          {(rates.length > 0 || payments.length > 0 || profile.rateFrom !== null) && (
            <Panel>
              <SectionTitle>{t("ratesTitle")}</SectionTitle>
              {profile.rateFrom !== null && rates.length === 0 && (
                <p className="text-gold font-serif text-2xl">
                  {t("rateFrom", { price: chf.format(profile.rateFrom) })}
                </p>
              )}
              {rates.length > 0 && (
                <dl className="grid grid-cols-2 gap-2.5">
                  {rates.map(({ field, amount }) => (
                    <div
                      key={field}
                      className="flex flex-col gap-1 rounded-xl border border-hairline bg-ink-soft/50 px-3.5 py-3"
                    >
                      <dt className="text-[10.5px] uppercase tracking-[0.14em] text-ink2-faint">
                        {t(`rates.${field}`)}
                      </dt>
                      <dd className="text-gold font-serif text-xl">{chf.format(amount)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {payments.length > 0 && (
                <dl>
                  <InfoRow label={t("paymentLabel")}>{payments.join(" · ")}</InfoRow>
                </dl>
              )}
              <p className="text-xs text-ink2-faint">{t("ratesNote")}</p>
            </Panel>
          )}

          {hasServices && (
            <Panel>
              <SectionTitle>{t("servicesTitle")}</SectionTitle>
              <dl className="flex flex-col gap-2.5 text-[15px]">
                {meeting.length > 0 && <InfoRow label={t("meetingLabel")}>{meeting.join(" · ")}</InfoRow>}
                {clientele.length > 0 && <InfoRow label={t("clienteleLabel")}>{clientele.join(" · ")}</InfoRow>}
                {contactChannels.length > 0 && (
                  <InfoRow label={t("contactByLabel")}>{contactChannels.join(" · ")}</InfoRow>
                )}
                {salon && (
                  <InfoRow label={t("salonLabel")}>
                    <Link href="/salons" className="underline-offset-4 hover:underline">
                      {salon.name}
                    </Link>{" "}
                    <span className="text-ink2-faint">({salon.city})</span>
                  </InfoRow>
                )}
              </dl>
              {services.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <Pill key={s.key}>{s.label}</Pill>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {(days || hours) && (
            <Panel>
              <SectionTitle>{t("availabilityTitle")}</SectionTitle>
              <dl className="flex flex-col gap-2.5 text-[15px]">
                {days && <InfoRow label={t("daysLabel")}>{days}</InfoRow>}
                {hours && <InfoRow label={t("hoursLabel")}>{hours}</InfoRow>}
              </dl>
            </Panel>
          )}

          {traits.length > 0 && (
            <Panel>
              <SectionTitle>{t("traitsTitle")}</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {traits.map((trait) => (
                  <Trait key={trait.label} label={trait.label} value={trait.value} />
                ))}
              </div>
            </Panel>
          )}

          {profile.languages.length > 0 && (
            <Panel>
              <SectionTitle>{t("languagesLabel")}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((l) => (
                  <Pill key={l.language.code}>{getLocalizedLabel(l.language.label, locale)}</Pill>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t border-hairline pt-5 text-xs text-ink2-faint sm:flex-row sm:items-center sm:justify-between md:col-span-2 md:row-start-3">
          <p>{t("locationNotice")}</p>
          <Link
            href={`/profiles/${profile.slug}/report`}
            className="self-start underline-offset-4 transition-colors hover:text-ink2-muted hover:underline sm:self-auto"
          >
            {t("reportProfile")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
