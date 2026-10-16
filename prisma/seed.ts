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
 * 18 profils fictifs publiés, répartis sur 18 villes de Suisse romande
 * (GE/VD/VS), avec des images placeholder générées localement (aucune
 * photo réelle, aucune personne réelle — voir ENGINEERING_RULES.md
 * "Données de test synthétiques uniquement" et scripts/lib/placeholder-png.ts).
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
import { BODY_TYPES, EYE_COLORS, HAIR_COLORS, type WeekDay } from "../src/modules/profiles/attributes";
import { hashPassword } from "../src/modules/auth/password";
import {
  createPlaceholderPng,
  createGradientPlaceholderPng,
  type GradientDirection,
} from "../scripts/lib/placeholder-png";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_PROVIDER_EMAIL = "prestataire@example.test";
const LEGACY_LEA_EMAIL = "lea.demo@example.test";
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
  direction: GradientDirection = "diagonal",
): Promise<string> {
  await mkdir(MEDIA_LOCAL_PATH, { recursive: true });
  const storageKey = `${randomBytes(16).toString("hex")}.png`;
  await writeFile(
    path.join(MEDIA_LOCAL_PATH, storageKey),
    createGradientPlaceholderPng(from, to, 512, direction),
  );
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
    { key: "escort", label: { fr: "Escorte", en: "Escort", de: "Escort", it: "Escort" } },
    {
      key: "masseuse",
      label: { fr: "Masseuse érotique", en: "Erotic masseuse", de: "Erotische Masseurin", it: "Massaggiatrice erotica" },
    },
    { key: "striptease", label: { fr: "Striptease", en: "Striptease", de: "Striptease", it: "Spogliarello" } },
    { key: "dominatrice", label: { fr: "BDSM/Domina", en: "BDSM/Domina", de: "BDSM/Domina", it: "BDSM/Domina" } },
    { key: "trans", label: { fr: "Trans", en: "Trans", de: "Trans", it: "Trans" } },
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
    // "Reçoit" / "Se déplace" ne sont plus des services mais des champs du
    // profil (receives / travels) — voir la migration *_add_profile_details.
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
  // liées à une adresse individuelle (contrainte #8). Limité à trois
  // cantons romands (GE, VD, VS), villes principales uniquement — même
  // liste utilisée par le sélecteur de ville du formulaire prestataire et
  // par le filtre de recherche public (groupés par canton, voir
  // src/lib/group-cities.ts).
  const cities: { name: string; canton: string; lat: number; lng: number }[] = [
    // Genève
    { name: "Genève", canton: "GE", lat: 46.2044, lng: 6.1432 },
    { name: "Carouge", canton: "GE", lat: 46.1817, lng: 6.1389 },
    { name: "Vernier", canton: "GE", lat: 46.2167, lng: 6.0833 },
    { name: "Meyrin", canton: "GE", lat: 46.2333, lng: 6.0667 },
    { name: "Lancy", canton: "GE", lat: 46.1833, lng: 6.1167 },
    // Vaud
    { name: "Lausanne", canton: "VD", lat: 46.5197, lng: 6.6323 },
    { name: "Montreux", canton: "VD", lat: 46.4312, lng: 6.9107 },
    { name: "Vevey", canton: "VD", lat: 46.4628, lng: 6.8419 },
    { name: "Nyon", canton: "VD", lat: 46.3833, lng: 6.2333 },
    { name: "Morges", canton: "VD", lat: 46.5089, lng: 6.4983 },
    { name: "Yverdon-les-Bains", canton: "VD", lat: 46.7785, lng: 6.641 },
    { name: "Renens", canton: "VD", lat: 46.5378, lng: 6.5906 },
    // Valais
    { name: "Sion", canton: "VS", lat: 46.2331, lng: 7.3604 },
    { name: "Sierre", canton: "VS", lat: 46.2919, lng: 7.5354 },
    { name: "Martigny", canton: "VS", lat: 46.1025, lng: 7.0729 },
    { name: "Monthey", canton: "VS", lat: 46.2547, lng: 6.9556 },
    { name: "Brig", canton: "VS", lat: 46.3182, lng: 7.9876 },
    { name: "Viège", canton: "VS", lat: 46.2926, lng: 7.8824 },
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

  // Deux comptes de démo clairs, un par espace : admin@example.test (/admin)
  // et prestataire@example.test (/dashboard). Le compte prestataire reprend
  // le profil publié de Léa : l'ancien compte lea.demo@example.test est
  // renommé, sans recréer ni dupliquer le profil.
  const [legacyLea, provider] = await Promise.all([
    prisma.user.findUnique({ where: { email: LEGACY_LEA_EMAIL } }),
    prisma.user.findUnique({ where: { email: DEMO_PROVIDER_EMAIL } }),
  ]);
  if (legacyLea && !provider) {
    await prisma.user.update({ where: { id: legacyLea.id }, data: { email: DEMO_PROVIDER_EMAIL } });
  }

  // L'ancien compte de démo "modérateur" n'a plus d'espace (seul l'admin
  // ouvre /admin) : supprimé s'il n'a laissé aucune trace (actions de
  // modération, journal) ; sinon conservé tel quel pour l'historique.
  await prisma.user
    .deleteMany({
      where: { email: "moderator@example.test", moderationActionsTaken: { none: {} }, auditLogs: { none: {} } },
    })
    .catch(() => undefined);

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
    prisma.service.findMany({ where: { key: { in: spec.serviceKeys.filter((k) => !TRAVEL_KEYS.has(k)) } } }),
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
      receives: spec.serviceKeys.includes("incall"),
      travels: spec.serviceKeys.includes("outcall"),
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

// Clés historiques des specs de démo, devenues les champs receives/travels.
const TRAVEL_KEYS = new Set(["incall", "outcall"]);

const DEMO_HEIGHTS = [165, 170, 158, 172, 168, 175, 162, 169, 160, 174, 166, 171, 163, 177, 159, 167, 173, 164];
const DEMO_DAYS: WeekDay[][] = [
  ["MON", "TUE", "WED", "THU", "FRI"],
  ["TUE", "WED", "THU", "FRI", "SAT"],
  ["MON", "WED", "FRI", "SAT"],
  ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  ["THU", "FRI", "SAT", "SUN"],
];
const DEMO_HOURS: [string, string][] = [
  ["10:00", "20:00"],
  ["14:00", "23:00"],
  ["18:00", "02:00"],
  ["11:00", "19:00"],
  ["20:00", "04:00"],
];

/**
 * Remplit tarifs indicatifs, caractéristiques et disponibilités d'un profil
 * de démo (valeurs fictives, déterministes selon sa position). Comme
 * seedDemoGallery(), s'applique aussi aux profils déjà seedés, une seule
 * fois : ne touche à rien si l'un de ces champs est déjà renseigné. Quelques
 * profils restent volontairement incomplets (champs facultatifs).
 */
async function seedDemoDetails(spec: DemoProfileSpec, index: number) {
  const profile = await prisma.providerProfile.findFirst({
    where: { user: { email: spec.email } },
    select: { id: true, heightCm: true, rate1Hour: true, availableDays: true },
  });
  if (!profile || profile.heightCm !== null || profile.rate1Hour !== null || profile.availableDays.length > 0) {
    return;
  }

  const hourly = 220 + (index % 5) * 30;
  const [from, to] = DEMO_HOURS[index % DEMO_HOURS.length]!;
  const hasHours = index % 6 !== 5;
  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      heightCm: DEMO_HEIGHTS[index % DEMO_HEIGHTS.length],
      bodyType: BODY_TYPES[(index * 2) % BODY_TYPES.length],
      hairColor: HAIR_COLORS[index % HAIR_COLORS.length],
      eyeColor: index % 4 === 3 ? null : EYE_COLORS[index % EYE_COLORS.length],
      rate30Min: index % 3 === 0 ? null : Math.round((hourly * 0.6) / 10) * 10,
      rate1Hour: hourly,
      rate2Hours: Math.round((hourly * 1.8) / 10) * 10,
      rateNight: index % 4 === 1 ? null : 1000 + (index % 4) * 200,
      availableDays: DEMO_DAYS[index % DEMO_DAYS.length],
      availableFrom: hasHours ? from : null,
      availableTo: hasHours ? to : null,
    },
  });
}

type Rgb = [number, number, number];

function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return color.map((c, i) => Math.round(c + (target[i]! - c) * amount)) as Rgb;
}

/** Nombre de visuels approuvés visés par profil de démo (galerie de la page profil). */
const DEMO_GALLERY_SIZE = 4;

/**
 * Complète la galerie d'un profil de démo avec des variantes de son dégradé
 * (sens inversé, plus sombre, plus clair) jusqu'à DEMO_GALLERY_SIZE visuels
 * approuvés. Séparé de seedDemoProfile() pour s'appliquer aussi aux profils
 * déjà seedés (sans les recréer) : idempotent, ne fait rien si la galerie
 * est déjà complète. Toujours des dégradés synthétiques, aucune photo.
 */
async function seedDemoGallery(spec: DemoProfileSpec, moderatorId: string) {
  const base = spec.photoGradients?.[0];
  if (!base) return;

  const profile = await prisma.providerProfile.findFirst({
    where: { user: { email: spec.email } },
    select: { id: true, media: { select: { status: true, position: true } } },
  });
  if (!profile) return;

  const approvedCount = profile.media.filter((m) => m.status === "APPROVED").length;
  const missing = DEMO_GALLERY_SIZE - approvedCount;
  if (missing <= 0) return;

  const [from, to] = base;
  const black: Rgb = [14, 17, 22];
  const cream: Rgb = [237, 235, 230];
  const variants: [Rgb, Rgb, GradientDirection][] = [
    [to, from, "vertical"],
    [mix(to, black, 0.45), from, "horizontal"],
    [mix(from, cream, 0.35), mix(to, black, 0.2), "diagonal"],
  ];

  let position = Math.max(-1, ...profile.media.map((m) => m.position)) + 1;
  for (const [variantFrom, variantTo, direction] of variants.slice(0, missing)) {
    const storageKey = await writeGradientPlaceholderMediaFile(variantFrom, variantTo, direction);
    await prisma.media.create({
      data: {
        profileId: profile.id,
        storageKey,
        position,
        status: "APPROVED",
        moderatedById: moderatorId,
        moderatedAt: new Date(),
      },
    });
    position += 1;
  }
}

// 18 profils fictifs, un par ville de la liste ci-dessus (seedCities), pour
// une répartition géographique maximale — jamais tous à Genève. Catégories
// réparties entre les 5 taxonomies (escort/masseuse/striptease/dominatrice/
// trans), âges 19-39, 2-3 langues chacun, statut en ligne varié, et un
// dégradé de couleurs distinct par profil (createGradientPlaceholderPng) —
// toujours sans la moindre photo réelle, voir ENGINEERING_RULES.md "Données
// de test synthétiques uniquement".
const DEMO_PROFILES: DemoProfileSpec[] = [
  {
    email: DEMO_PROVIDER_EMAIL,
    displayName: "Léa",
    age: 27,
    description:
      "Léa, annonceuse indépendante basée à Genève. Rencontres chaleureuses et respectueuses, sur rendez-vous uniquement.",
    citySlug: "geneve-ge",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [214, 178, 202],
        [150, 90, 120],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 01",
    contactEmail: "lea.demo@example.test",
    whatsapp: "+41 78 200 00 01",
    instagram: "@lea.demo",
  },
  {
    email: "ines.demo@example.test",
    displayName: "Inès",
    age: 23,
    description:
      "Inès, annonceuse indépendante basée à Carouge. Rencontres chaleureuses et respectueuses, sur rendez-vous.",
    citySlug: "carouge-ge",
    categoryKey: "escort",
    languageCodes: ["fr", "en", "it"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [230, 160, 140],
        [120, 50, 60],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 02",
    contactEmail: "ines.demo@example.test",
    whatsapp: "+41 78 200 00 02",
    instagram: "@ines.demo",
  },
  {
    email: "jade.demo@example.test",
    displayName: "Jade",
    age: 25,
    description:
      "Jade, annonceuse indépendante basée à Nyon. Rencontres chaleureuses dans un cadre élégant et respectueux.",
    citySlug: "nyon-vd",
    categoryKey: "escort",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [150, 200, 190],
        [50, 80, 140],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 03",
    contactEmail: "jade.demo@example.test",
    whatsapp: "+41 78 200 00 03",
  },
  {
    email: "emma.demo@example.test",
    displayName: "Emma",
    age: 36,
    description:
      "Emma, annonceuse indépendante basée à Brig. Rencontres chaleureuses et respectueuses, sur rendez-vous.",
    citySlug: "brig-vs",
    categoryKey: "escort",
    languageCodes: ["fr", "de"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [235, 205, 215],
        [140, 90, 130],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 04",
    contactEmail: "emma.demo@example.test",
    whatsapp: "+41 78 200 00 04",
    instagram: "@emma.demo",
  },
  {
    email: "nora.demo@example.test",
    displayName: "Nora",
    age: 34,
    description:
      "Nora, masseuse indépendante à Lausanne. Massages relaxants dans un cadre discret et confortable, sur rendez-vous.",
    citySlug: "lausanne-vd",
    categoryKey: "masseuse",
    languageCodes: ["fr", "de"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    // Deux photos : la première approuvée (toujours un visuel public,
    // jamais de profil sans photo), la seconde laissée PENDING à dessein
    // pour exercer la file de modération des médias sur un profil déjà
    // publié.
    photoGradients: [
      [
        [190, 210, 180],
        [60, 100, 70],
      ],
      [
        [160, 190, 150],
        [40, 80, 50],
      ],
    ],
    pendingPhotoCount: 1,
    phone: "+41 78 200 00 05",
    contactEmail: "nora.demo@example.test",
    whatsapp: "+41 78 200 00 05",
  },
  {
    email: "manon.demo@example.test",
    displayName: "Manon",
    age: 22,
    description:
      "Manon, masseuse indépendante à Vernier. Massages relaxants dans un cadre soigné, sur rendez-vous.",
    citySlug: "vernier-ge",
    categoryKey: "masseuse",
    languageCodes: ["fr", "it"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [225, 200, 160],
        [170, 100, 70],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 06",
    contactEmail: "manon.demo@example.test",
    whatsapp: "+41 78 200 00 06",
  },
  {
    email: "sofia.demo@example.test",
    displayName: "Sofia",
    age: 31,
    description:
      "Sofia, masseuse indépendante à Meyrin. Massages relaxants dans un cadre discret et confortable.",
    citySlug: "meyrin-ge",
    categoryKey: "masseuse",
    languageCodes: ["fr", "de"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [230, 200, 140],
        [180, 120, 40],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 07",
    contactEmail: "sofia.demo@example.test",
    whatsapp: "+41 78 200 00 07",
    instagram: "@sofia.demo",
  },
  {
    email: "alice.demo@example.test",
    displayName: "Alice",
    age: 38,
    description:
      "Alice, masseuse indépendante basée à Morges. Massages relaxants dans un cadre chaleureux et confortable.",
    citySlug: "morges-vd",
    categoryKey: "masseuse",
    languageCodes: ["fr", "de", "en"],
    serviceKeys: ["incall", "massage"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [190, 220, 210],
        [70, 100, 110],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 08",
    contactEmail: "alice.demo@example.test",
    whatsapp: "+41 78 200 00 08",
  },
  {
    email: "chloe.demo@example.test",
    displayName: "Chloé",
    age: 28,
    description:
      "Chloé, artiste indépendante basée à Montreux. Spectacles de striptease privés et élégants, sur rendez-vous, dans la discrétion.",
    citySlug: "montreux-vd",
    categoryKey: "striptease",
    languageCodes: ["fr", "en"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [170, 130, 190],
        [40, 30, 70],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 09",
    contactEmail: "chloe.demo@example.test",
    whatsapp: "+41 78 200 00 09",
    instagram: "@chloe.demo",
  },
  {
    email: "leonie.demo@example.test",
    displayName: "Léonie",
    age: 33,
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
        [35, 25, 30],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 10",
    contactEmail: "leonie.demo@example.test",
    whatsapp: "+41 78 200 00 10",
    instagram: "@leonie.demo",
  },
  {
    email: "lina.demo@example.test",
    displayName: "Lina",
    age: 21,
    description:
      "Lina, artiste indépendante basée à Martigny. Spectacles de striptease privés, élégants et sur rendez-vous.",
    citySlug: "martigny-vs",
    categoryKey: "striptease",
    languageCodes: ["fr", "it"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [210, 160, 90],
        [110, 50, 50],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 11",
    contactEmail: "lina.demo@example.test",
    whatsapp: "+41 78 200 00 11",
  },
  {
    email: "sarah.demo@example.test",
    displayName: "Sarah",
    age: 29,
    description:
      "Sarah, artiste indépendante basée à Viège. Spectacles de striptease privés et sur mesure, dans le respect et la discrétion.",
    citySlug: "viege-vs",
    categoryKey: "striptease",
    languageCodes: ["fr", "de"],
    serviceKeys: ["evenements", "outcall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [180, 160, 210],
        [35, 30, 55],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 12",
    contactEmail: "sarah.demo@example.test",
    whatsapp: "+41 78 200 00 12",
  },
  {
    email: "camille.demo@example.test",
    displayName: "Camille",
    age: 30,
    description:
      "Camille, praticienne BDSM indépendante basée à Sion. Séances de domination sur rendez-vous, dans le respect des limites de chacun.",
    citySlug: "sion-vs",
    categoryKey: "dominatrice",
    languageCodes: ["fr", "en", "de"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [150, 170, 210],
        [30, 45, 90],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 13",
    contactEmail: "camille.demo@example.test",
    whatsapp: "+41 78 200 00 13",
    instagram: "@camille.demo",
  },
  {
    email: "elena.demo@example.test",
    displayName: "Elena",
    age: 35,
    description:
      "Elena, praticienne BDSM indépendante basée à Vevey. Séances de domination sur rendez-vous, dans un cadre sécurisé et respectueux.",
    citySlug: "vevey-vd",
    categoryKey: "dominatrice",
    languageCodes: ["fr", "en", "it"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [235, 195, 175],
        [190, 110, 130],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 14",
    contactEmail: "elena.demo@example.test",
    whatsapp: "+41 78 200 00 14",
  },
  {
    email: "clara.demo@example.test",
    displayName: "Clara",
    age: 24,
    description:
      "Clara, praticienne BDSM indépendante basée à Yverdon-les-Bains. Séances sur rendez-vous, dans le respect des limites de chacun.",
    citySlug: "yverdon-les-bains-vd",
    categoryKey: "dominatrice",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [210, 180, 220],
        [110, 70, 130],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 15",
    contactEmail: "clara.demo@example.test",
    whatsapp: "+41 78 200 00 15",
    instagram: "@clara.demo",
  },
  {
    email: "maya.demo@example.test",
    displayName: "Maya",
    age: 27,
    description:
      "Maya, annonceuse trans indépendante basée à Renens. Rencontres chaleureuses et respectueuses, sur rendez-vous.",
    citySlug: "renens-vd",
    categoryKey: "trans",
    languageCodes: ["fr", "en", "de"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "AWAY",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [180, 185, 230],
        [55, 60, 120],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 16",
    contactEmail: "maya.demo@example.test",
    whatsapp: "+41 78 200 00 16",
    instagram: "@maya.demo",
  },
  {
    email: "zoe.demo@example.test",
    displayName: "Zoé",
    age: 32,
    description:
      "Zoé, annonceuse trans indépendante basée à Monthey. Rencontres chaleureuses dans un cadre élégant et respectueux.",
    citySlug: "monthey-vs",
    categoryKey: "trans",
    languageCodes: ["fr", "it"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "ONLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [175, 215, 205],
        [50, 120, 120],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 17",
    contactEmail: "zoe.demo@example.test",
    whatsapp: "+41 78 200 00 17",
  },
  {
    email: "nina.demo@example.test",
    displayName: "Nina",
    age: 26,
    description:
      "Nina, annonceuse trans indépendante basée à Lancy. Rencontres chaleureuses et respectueuses, sur rendez-vous uniquement.",
    citySlug: "lancy-ge",
    categoryKey: "trans",
    languageCodes: ["fr", "en"],
    serviceKeys: ["outcall", "incall"],
    onlineStatus: "OFFLINE",
    profileStatus: "PUBLISHED",
    photoGradients: [
      [
        [235, 200, 165],
        [190, 130, 70],
      ],
    ],
    pendingPhotoCount: 0,
    phone: "+41 78 200 00 18",
    contactEmail: "nina.demo@example.test",
    whatsapp: "+41 78 200 00 18",
    instagram: "@nina.demo",
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
  for (const [index, spec] of DEMO_PROFILES.entries()) {
    await seedDemoProfile(spec, passwordHash, adminId);
    await seedDemoGallery(spec, adminId);
    await seedDemoDetails(spec, index);
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      `Seed de démo terminé (${DEMO_PROFILES.length} profils fictifs).`,
      "Comptes de test (mot de passe unique, bêta uniquement — jamais en production) :",
      "  espace admin (/admin)              : admin@example.test",
      "  espace prestataire (/dashboard)    : prestataire@example.test (profil publié de Léa)",
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
