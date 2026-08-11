/**
 * Seed complet : données de fondation + jeu de démonstration synthétique.
 *
 * Fondation : données de référence sans lesquelles l'app ne peut pas
 * fonctionner (ex: ProviderProfile.planId est une clé étrangère
 * obligatoire, donc au moins un Plan doit exister ; une annonceuse ne peut
 * pas choisir une ville/catégorie/langue qui n'existe pas) — Plan founder,
 * politiques de rétention, pays autorisés, taxonomies de base.
 *
 * Démo synthétique : comptes de test (admin/modérateur/annonceuses) et
 * 3 profils fictifs à différents stades du cycle de vie (publié, publié
 * avec un média en attente, en attente de modération), avec des images
 * placeholder générées localement (aucune photo réelle, aucune personne
 * réelle — voir ENGINEERING_RULES.md "Données de test synthétiques
 * uniquement" et scripts/lib/placeholder-png.ts).
 *
 * ⚠️ Les comptes créés ici utilisent un mot de passe de démonstration
 * connu (voir DEMO_PASSWORD) : à ne jamais utiliser en dehors d'un
 * environnement de bêta privée non exposé publiquement.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { DATA_CATEGORIES } from "../src/modules/retention/retention-policy.service";
import { slugify, slugifyWithSuffix } from "../src/lib/slugify";
import { hashPassword } from "../src/modules/auth/password";
import { createPlaceholderPng } from "../scripts/lib/placeholder-png";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPassword123!";
const MEDIA_LOCAL_PATH = process.env.MEDIA_LOCAL_PATH ?? "./storage/media";

// Écrit directement le fichier plutôt que de passer par
// modules/media/local-storage.ts : ce module importe le package
// "server-only" (qui jette une erreur hors du runtime serveur Next.js —
// voir tests/stubs/server-only.ts pour le même problème côté tests), donc
// inutilisable depuis un script exécuté en Node nu. Le seed reste
// volontairement indépendant de l'abstraction MediaStorage : il crée des
// fixtures de test, pas une opération métier.
async function writePlaceholderMediaFile(rgb: [number, number, number]): Promise<string> {
  await mkdir(MEDIA_LOCAL_PATH, { recursive: true });
  const storageKey = `${randomBytes(16).toString("hex")}.png`;
  await writeFile(path.join(MEDIA_LOCAL_PATH, storageKey), createPlaceholderPng(rgb));
  return storageKey;
}

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

async function seedDemoAccounts() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.test" },
    update: {},
    create: { email: "admin@example.test", passwordHash, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "moderator@example.test" },
    update: {},
    create: { email: "moderator@example.test", passwordHash, role: "MODERATOR" },
  });

  return { adminId: admin.id, passwordHash };
}

interface DemoProfileSpec {
  email: string;
  displayName: string;
  description: string;
  citySlug: string;
  categoryKey: string;
  languageCodes: string[];
  serviceKeys: string[];
  onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  profileStatus: "PUBLISHED" | "PENDING_REVIEW";
  /** Une couleur unie par photo placeholder (RGB) — purement abstrait, aucune photo réelle. */
  photoColors: [number, number, number][];
  /** Nombre de photos, parmi photoColors, laissées PENDING (non modérées) plutôt qu'APPROVED. */
  pendingPhotoCount: number;
  phone: string;
  contactEmail: string;
}

async function seedDemoProfile(spec: DemoProfileSpec, passwordHash: string, moderatorId: string) {
  const existingUser = await prisma.user.findUnique({ where: { email: spec.email } });
  if (existingUser) return; // déjà seedé — idempotent

  const user = await prisma.user.create({
    data: { email: spec.email, passwordHash, role: "PROVIDER" },
  });

  await prisma.onboardingAttestation.create({
    data: {
      providerId: user.id,
      attestedAdult: true,
      attestedVoluntary: true,
      attestedAuthorizedToWorkInSwitzerland: true,
      attestedCantonalDeclaration: true,
      attestedAt: new Date(),
    },
  });

  await prisma.verificationRecord.create({
    data: {
      providerId: user.id,
      verificationProvider: "mock",
      externalVerificationId: `mock_seed_${randomUUID()}`,
      status: "VERIFIED",
      isAdult: true,
      documentType: "passport",
      issuingCountry: "CH",
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const [city, category, languages, services, founderPlan] = await Promise.all([
    prisma.city.findUniqueOrThrow({ where: { slug: spec.citySlug } }),
    prisma.category.findUniqueOrThrow({ where: { key: spec.categoryKey } }),
    prisma.language.findMany({ where: { code: { in: spec.languageCodes } } }),
    prisma.service.findMany({ where: { key: { in: spec.serviceKeys } } }),
    prisma.plan.findUniqueOrThrow({ where: { code: "founder" } }),
  ]);

  const profile = await prisma.providerProfile.create({
    data: {
      userId: user.id,
      slug: slugifyWithSuffix(spec.displayName),
      displayName: spec.displayName,
      description: spec.description,
      cityId: city.id,
      categoryId: category.id,
      planId: founderPlan.id,
      status: spec.profileStatus,
      publishedAt: spec.profileStatus === "PUBLISHED" ? new Date() : null,
      onlineStatus: spec.onlineStatus,
      languages: { create: languages.map((l) => ({ languageId: l.id })) },
      services: { create: services.map((s) => ({ serviceId: s.id })) },
    },
  });

  await prisma.profileContact.create({
    data: { profileId: profile.id, phone: spec.phone, email: spec.contactEmail },
  });

  for (let i = 0; i < spec.photoColors.length; i += 1) {
    const storageKey = await writePlaceholderMediaFile(spec.photoColors[i]!);
    const isPending = i >= spec.photoColors.length - spec.pendingPhotoCount;
    await prisma.media.create({
      data: {
        profileId: profile.id,
        storageKey,
        position: i,
        status: isPending ? "PENDING" : "APPROVED",
        moderatedById: isPending ? null : moderatorId,
        moderatedAt: isPending ? null : new Date(),
      },
    });
  }
}

const DEMO_PROFILES: DemoProfileSpec[] = [
  {
    email: "lea.demo@example.test",
    displayName: "Léa",
    description:
      "Bonjour, je m'appelle Léa. Annonceuse indépendante basée à Genève, je propose des rencontres chaleureuses et respectueuses. N'hésitez pas à me contacter pour plus d'informations.",
    citySlug: "geneve-ge",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoColors: [
      [214, 178, 202],
      [178, 202, 214],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 01",
    contactEmail: "lea.demo@example.test",
  },
  {
    email: "nora.demo@example.test",
    displayName: "Nora",
    description:
      "Nora, masseuse indépendante à Lausanne. Je propose des massages relaxants dans un cadre discret et confortable. Contactez-moi pour convenir d'un rendez-vous.",
    citySlug: "lausanne-vd",
    categoryKey: "masseuse",
    languageCodes: ["fr", "de"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoColors: [
      [202, 214, 178],
      [220, 200, 180],
    ],
    // La deuxième photo reste PENDING : permet de tester la file de
    // modération des médias sur un profil déjà publié.
    pendingPhotoCount: 1,
    phone: "+41 78 000 00 02",
    contactEmail: "nora.demo@example.test",
  },
  {
    email: "camille.demo@example.test",
    displayName: "Camille",
    description:
      "Camille, basée à Zürich. Profil complété et vérifié, en attente de validation par la modération.",
    citySlug: "zurich-zh",
    categoryKey: "dominatrice",
    languageCodes: ["en", "de"],
    serviceKeys: ["outcall"],
    onlineStatus: "OFFLINE",
    // Vérification et attestation complètes, mais pas encore approuvé par
    // un modérateur : permet de tester la file de modération des profils.
    profileStatus: "PENDING_REVIEW",
    photoColors: [[190, 190, 220]],
    pendingPhotoCount: 1,
    phone: "+41 78 000 00 03",
    contactEmail: "camille.demo@example.test",
  },
];

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

  const { adminId, passwordHash } = await seedDemoAccounts();
  for (const spec of DEMO_PROFILES) {
    await seedDemoProfile(spec, passwordHash, adminId);
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      "Seed de démo terminé.",
      "Comptes de test (mot de passe unique, bêta uniquement — jamais en production) :",
      "  admin@example.test / moderator@example.test / lea.demo@example.test / nora.demo@example.test / camille.demo@example.test",
      `  mot de passe : ${DEMO_PASSWORD}`,
    ].join("\n"),
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
