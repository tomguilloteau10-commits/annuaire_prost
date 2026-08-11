/**
 * Seed de fondation — pas le seed de démo complet.
 *
 * Crée les données de référence sans lesquelles l'app ne peut pas
 * fonctionner (ex: ProviderProfile.planId est une clé étrangère
 * obligatoire, donc au moins un Plan doit exister ; une annonceuse ne peut
 * pas choisir une ville/catégorie/langue qui n'existe pas) : Plan founder,
 * politiques de rétention, pays autorisés, et les taxonomies de base
 * (catégories, services, langues, villes suisses) — éditables ensuite
 * depuis l'admin, pas figées.
 *
 * Il n'insère en revanche aucun profil ni photo fictifs — ça arrive dans
 * une étape dédiée ("seed synthétique") avec 2-3 profils fictifs et des
 * images placeholder, voir ENGINEERING_RULES.md et docs/ARCHITECTURE.md.
 */
import { PrismaClient } from "@prisma/client";
import { DATA_CATEGORIES } from "../src/modules/retention/retention-policy.service";
import { slugify } from "../src/lib/slugify";

const prisma = new PrismaClient();

async function seedFounderPlan() {
  await prisma.plan.upsert({
    where: { code: "founder" },
    update: {},
    create: {
      code: "founder",
      name: "Founder (bêta, gratuit)",
      features: { maxPhotos: 6, boost: false, prioritySupport: false },
      isActive: true,
    },
  });
}

async function seedRetentionPolicies() {
  const defaults: { dataCategory: string; retentionDays: number; description: string }[] = [
    {
      dataCategory: DATA_CATEGORIES.SESSION_IP_HASH,
      retentionDays: 90,
      description: "Hash d'IP de session — anti-abus uniquement, pas d'archivage.",
    },
    {
      dataCategory: DATA_CATEGORIES.ONBOARDING_ATTESTATION_IP_HASH,
      retentionDays: 90,
      description: "Hash d'IP associé à l'attestation d'onboarding (l'attestation elle-même est conservée).",
    },
    {
      dataCategory: DATA_CATEGORIES.CONTACT_REVEAL_LOG,
      retentionDays: 30,
      description: "Journal de révélation de contact — rate limiting et anti-abus.",
    },
    {
      dataCategory: DATA_CATEGORIES.VERIFICATION_RECORD_AUDIT,
      retentionDays: 730,
      description: "Rétention d'audit des résultats de vérification (déjà rétention zéro sur le document).",
    },
    {
      dataCategory: DATA_CATEGORIES.MEDIA_REJECTED,
      retentionDays: 30,
      description: "Médias rejetés en modération — purgés après ce délai.",
    },
  ];

  for (const policy of defaults) {
    await prisma.dataRetentionPolicy.upsert({
      where: { dataCategory: policy.dataCategory },
      update: {},
      create: policy,
    });
  }
}

async function seedAllowedCountries() {
  await prisma.allowedCountry.upsert({
    where: { countryCode: "CH" },
    update: {},
    create: { countryCode: "CH", isAllowed: true },
  });
}

async function seedCategories() {
  const categories: { key: string; label: Record<string, string> }[] = [
    { key: "escort", label: { fr: "Escort", en: "Escort", de: "Escort", it: "Escort" } },
    { key: "masseuse", label: { fr: "Masseuse", en: "Masseuse", de: "Masseurin", it: "Massaggiatrice" } },
    { key: "dominatrice", label: { fr: "Dominatrice", en: "Dominatrix", de: "Dominatrix", it: "Dominatrice" } },
  ];
  for (const category of categories) {
    await prisma.category.upsert({
      where: { key: category.key },
      update: {},
      create: category,
    });
  }
}

async function seedServices() {
  const services: { key: string; label: Record<string, string> }[] = [
    { key: "outcall", label: { fr: "Déplacement (outcall)", en: "Outcall", de: "Hausbesuch", it: "A domicilio" } },
    { key: "incall", label: { fr: "Reçoit (incall)", en: "Incall", de: "Empfängt", it: "Riceve" } },
    { key: "massage", label: { fr: "Massage", en: "Massage", de: "Massage", it: "Massaggio" } },
    {
      key: "evenements",
      label: {
        fr: "Accompagnement événementiel",
        en: "Event companionship",
        de: "Begleitung bei Veranstaltungen",
        it: "Accompagnamento eventi",
      },
    },
  ];
  for (const service of services) {
    await prisma.service.upsert({
      where: { key: service.key },
      update: {},
      create: service,
    });
  }
}

async function seedLanguages() {
  const languages: { code: string; label: Record<string, string> }[] = [
    { code: "fr", label: { fr: "Français", en: "French", de: "Französisch", it: "Francese" } },
    { code: "en", label: { fr: "Anglais", en: "English", de: "Englisch", it: "Inglese" } },
    { code: "de", label: { fr: "Allemand", en: "German", de: "Deutsch", it: "Tedesco" } },
    { code: "it", label: { fr: "Italien", en: "Italian", de: "Italienisch", it: "Italiano" } },
  ];
  for (const language of languages) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: {},
      create: language,
    });
  }
}

async function seedCities() {
  // Coordonnées de centre-ville (donnée publique généraliste), jamais
  // liées à une adresse individuelle (contrainte #8).
  const cities: { name: string; canton: string; lat: number; lng: number }[] = [
    { name: "Genève", canton: "GE", lat: 46.2044, lng: 6.1432 },
    { name: "Lausanne", canton: "VD", lat: 46.5197, lng: 6.6323 },
    { name: "Zürich", canton: "ZH", lat: 47.3769, lng: 8.5417 },
    { name: "Berne", canton: "BE", lat: 46.948, lng: 7.4474 },
    { name: "Bâle", canton: "BS", lat: 47.5596, lng: 7.5886 },
  ];
  for (const city of cities) {
    const slug = slugify(`${city.name}-${city.canton}`);
    await prisma.city.upsert({
      where: { slug },
      update: {},
      create: { ...city, slug, country: "CH" },
    });
  }
}

async function main() {
  await seedFounderPlan();
  await seedRetentionPolicies();
  await seedAllowedCountries();
  await seedCategories();
  await seedServices();
  await seedLanguages();
  await seedCities();
  // eslint-disable-next-line no-console
  console.log(
    "Seed de fondation terminé (Plan founder, politiques de rétention, pays autorisés, taxonomies de base).",
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
