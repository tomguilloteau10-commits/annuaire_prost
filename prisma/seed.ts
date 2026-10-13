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
import { createPlaceholderPng, createGradientPlaceholderPng } from "../scripts/lib/placeholder-png";

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

async function writeGradientPlaceholderMediaFile(
  from: [number, number, number],
  to: [number, number, number],
): Promise<string> {
  await mkdir(MEDIA_LOCAL_PATH, { recursive: true });
  const storageKey = `${randomBytes(16).toString("hex")}.png`;
  await writeFile(path.join(MEDIA_LOCAL_PATH, storageKey), createGradientPlaceholderPng(from, to));
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
    { key: "striptease", label: { fr: "Striptease", en: "Striptease", de: "Striptease", it: "Spogliarello" } },
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
    { name: "Sion", canton: "VS", lat: 46.2331, lng: 7.3604 },
    { name: "Neuchâtel", canton: "NE", lat: 46.99, lng: 6.9293 },
    { name: "Sierre", canton: "VS", lat: 46.2919, lng: 7.5354 },
    { name: "Brig", canton: "VS", lat: 46.3182, lng: 7.9876 },
    { name: "Vevey", canton: "VD", lat: 46.4628, lng: 6.8419 },
    { name: "Martigny", canton: "VS", lat: 46.1025, lng: 7.0729 },
    { name: "Montreux", canton: "VD", lat: 46.4312, lng: 6.9107 },
    { name: "Saint-Maurice", canton: "VS", lat: 46.2158, lng: 6.9989 },
    { name: "Fribourg", canton: "FR", lat: 46.8065, lng: 7.1619 },
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
  age: number;
  description: string;
  citySlug: string;
  categoryKey: string;
  languageCodes: string[];
  serviceKeys: string[];
  onlineStatus: "ONLINE" | "AWAY" | "OFFLINE";
  profileStatus: "PUBLISHED" | "PENDING_REVIEW";
  /** Une couleur unie par photo placeholder (RGB) — purement abstrait, aucune photo réelle. */
  photoColors?: [number, number, number][];
  /** Dégradé (2 couleurs) par photo placeholder — alternative plus soignée à photoColors. */
  photoGradients?: [[number, number, number], [number, number, number]][];
  /** Nombre de photos laissées PENDING (non modérées) plutôt qu'APPROVED. */
  pendingPhotoCount: number;
  phone: string;
  contactEmail: string;
  whatsapp: string;
  instagram?: string;
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
      age: spec.age,
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
    data: {
      profileId: profile.id,
      phone: spec.phone,
      email: spec.contactEmail,
      whatsapp: spec.whatsapp,
      instagram: spec.instagram,
    },
  });

  const photoCount = spec.photoGradients?.length ?? spec.photoColors?.length ?? 0;
  for (let i = 0; i < photoCount; i += 1) {
    const storageKey = spec.photoGradients
      ? await writeGradientPlaceholderMediaFile(...spec.photoGradients[i]!)
      : await writePlaceholderMediaFile(spec.photoColors![i]!);
    const isPending = i >= photoCount - spec.pendingPhotoCount;
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
    age: 27,
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
    whatsapp: "+41 78 000 00 01",
    instagram: "@lea.demo",
  },
  {
    email: "nora.demo@example.test",
    displayName: "Nora",
    age: 34,
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
    whatsapp: "+41 78 000 00 02",
  },
  {
    email: "camille.demo@example.test",
    displayName: "Camille",
    age: 29,
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
    whatsapp: "+41 78 000 00 03",
    instagram: "@camille.demo",
  },
  // Jeu de démonstration étendu : couvre la Suisse romande (contexte de la
  // carte interactive, modules/profiles) avec des catégories variées et des
  // photos en dégradé (createGradientPlaceholderPng) plutôt qu'en aplat,
  // toujours sans la moindre photo réelle (voir le commentaire au-dessus de
  // writeGradientPlaceholderMediaFile).
  {
    email: "ines.demo@example.test",
    displayName: "Inès",
    age: 26,
    description:
      "Inès, annonceuse indépendante basée à Genève. Rencontres chaleureuses et respectueuses, sur rendez-vous uniquement.",
    citySlug: "geneve-ge",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [214, 178, 202],
        [160, 120, 150],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 04",
    contactEmail: "ines.demo@example.test",
    whatsapp: "+41 78 000 00 04",
    instagram: "@ines.demo",
  },
  {
    email: "manon.demo@example.test",
    displayName: "Manon",
    age: 31,
    description:
      "Manon, masseuse indépendante à Genève. Massages relaxants dans un cadre discret et soigné, sur rendez-vous.",
    citySlug: "geneve-ge",
    categoryKey: "masseuse",
    languageCodes: ["fr", "it"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [178, 202, 190],
        [100, 150, 150],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 05",
    contactEmail: "manon.demo@example.test",
    whatsapp: "+41 78 000 00 05",
  },
  {
    email: "chloe.demo@example.test",
    displayName: "Chloé",
    age: 28,
    description:
      "Chloé, artiste indépendante basée à Lausanne. Spectacles de striptease privés, élégants et sur rendez-vous, dans la discrétion.",
    citySlug: "lausanne-vd",
    categoryKey: "striptease",
    languageCodes: ["fr"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [150, 110, 140],
        [40, 35, 60],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 06",
    contactEmail: "chloe.demo@example.test",
    whatsapp: "+41 78 000 00 06",
    instagram: "@chloe.demo",
  },
  {
    email: "elena.demo@example.test",
    displayName: "Elena",
    age: 33,
    description:
      "Elena, annonceuse indépendante à Lausanne. Rencontres chaleureuses dans un cadre élégant et respectueux.",
    citySlug: "lausanne-vd",
    categoryKey: "escort",
    languageCodes: ["fr", "en", "it"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [230, 190, 170],
        [200, 140, 150],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 07",
    contactEmail: "elena.demo@example.test",
    whatsapp: "+41 78 000 00 07",
  },
  {
    email: "sofia.demo@example.test",
    displayName: "Sofia",
    age: 30,
    description:
      "Sofia, masseuse indépendante à Sion. Massages relaxants dans un cadre discret et confortable, sur rendez-vous.",
    citySlug: "sion-vs",
    categoryKey: "masseuse",
    languageCodes: ["fr", "de"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [220, 190, 150],
        [180, 110, 80],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 08",
    contactEmail: "sofia.demo@example.test",
    whatsapp: "+41 78 000 00 08",
    instagram: "@sofia.demo",
  },
  {
    email: "jade.demo@example.test",
    displayName: "Jade",
    age: 25,
    description:
      "Jade, annonceuse indépendante basée à Neuchâtel. Rencontres chaleureuses et respectueuses, sur rendez-vous.",
    citySlug: "neuchatel-ne",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [150, 190, 190],
        [60, 90, 140],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 09",
    contactEmail: "jade.demo@example.test",
    whatsapp: "+41 78 000 00 09",
  },
  {
    email: "leonie.demo@example.test",
    displayName: "Léonie",
    age: 29,
    description:
      "Léonie, artiste indépendante basée à Sierre. Spectacles de striptease privés et sur mesure, dans le respect et la discrétion.",
    citySlug: "sierre-vs",
    categoryKey: "striptease",
    languageCodes: ["fr", "de"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [140, 70, 80],
        [40, 30, 35],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 10",
    contactEmail: "leonie.demo@example.test",
    whatsapp: "+41 78 000 00 10",
    instagram: "@leonie.demo",
  },
  {
    email: "alice.demo@example.test",
    displayName: "Alice",
    age: 35,
    description:
      "Alice, masseuse indépendante basée à Brig. Massages relaxants dans un cadre discret et confortable, sur rendez-vous.",
    citySlug: "brig-vs",
    categoryKey: "masseuse",
    languageCodes: ["de", "fr"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [180, 210, 200],
        [90, 110, 120],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 11",
    contactEmail: "alice.demo@example.test",
    whatsapp: "+41 78 000 00 11",
  },
  {
    email: "clara.demo@example.test",
    displayName: "Clara",
    age: 24,
    description:
      "Clara, annonceuse indépendante basée à Vevey. Rencontres chaleureuses et respectueuses, sur rendez-vous uniquement.",
    citySlug: "vevey-vd",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [230, 160, 140],
        [150, 90, 120],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 12",
    contactEmail: "clara.demo@example.test",
    whatsapp: "+41 78 000 00 12",
    instagram: "@clara.demo",
  },
  {
    email: "lina.demo@example.test",
    displayName: "Lina",
    age: 27,
    description:
      "Lina, artiste indépendante basée à Martigny. Spectacles de striptease privés, élégants et sur rendez-vous.",
    citySlug: "martigny-vs",
    categoryKey: "striptease",
    languageCodes: ["fr"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [200, 150, 90],
        [110, 50, 50],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 13",
    contactEmail: "lina.demo@example.test",
    whatsapp: "+41 78 000 00 13",
  },
  {
    email: "maya.demo@example.test",
    displayName: "Maya",
    age: 32,
    description:
      "Maya, annonceuse indépendante basée à Montreux. Rencontres chaleureuses dans un cadre élégant et respectueux.",
    citySlug: "montreux-vd",
    categoryKey: "escort",
    languageCodes: ["fr", "en", "de"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [190, 180, 220],
        [60, 70, 110],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 14",
    contactEmail: "maya.demo@example.test",
    whatsapp: "+41 78 000 00 14",
    instagram: "@maya.demo",
  },
  {
    email: "zoe.demo@example.test",
    displayName: "Zoé",
    age: 26,
    description:
      "Zoé, masseuse indépendante basée à Saint-Maurice. Massages relaxants dans un cadre discret et confortable.",
    citySlug: "saint-maurice-vs",
    categoryKey: "masseuse",
    languageCodes: ["fr"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [200, 215, 180],
        [230, 220, 190],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 15",
    contactEmail: "zoe.demo@example.test",
    whatsapp: "+41 78 000 00 15",
  },
  {
    email: "emma.demo@example.test",
    displayName: "Emma",
    age: 30,
    description:
      "Emma, annonceuse indépendante basée à Fribourg. Rencontres chaleureuses et respectueuses, sur rendez-vous.",
    citySlug: "fribourg-fr",
    categoryKey: "escort",
    languageCodes: ["fr", "de"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [230, 200, 210],
        [170, 130, 150],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 16",
    contactEmail: "emma.demo@example.test",
    whatsapp: "+41 78 000 00 16",
    instagram: "@emma.demo",
  },
  {
    email: "sarah.demo@example.test",
    displayName: "Sarah",
    age: 28,
    description:
      "Sarah, artiste indépendante basée à Fribourg. Spectacles de striptease privés et sur mesure, dans le respect et la discrétion.",
    citySlug: "fribourg-fr",
    categoryKey: "striptease",
    languageCodes: ["fr", "de"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [120, 90, 160],
        [25, 20, 30],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 000 00 17",
    contactEmail: "sarah.demo@example.test",
    whatsapp: "+41 78 000 00 17",
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
