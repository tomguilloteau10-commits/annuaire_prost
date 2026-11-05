/* eslint-disable no-console */
/**
 * Complète un ou deux profils de TEST avec les caractéristiques
 * filtrables (taille, silhouette, cheveux, yeux, origine, poitrine, poils,
 * tatouages, reçoit / se déplace, paiement, contact, tarif, services), pour
 * que les filtres de l'annuaire soient visibles en démonstration.
 *
 * - Les comptes sont désignés par leur ADRESSE DE CONNEXION.
 * - Seuls les champs encore vides sont remplis : rien de ce que la
 *   prestataire a déjà saisi n'est écrasé.
 * - Le statut du profil n'est jamais modifié (pas de publication forcée).
 *
 * Liste des comptes : `npm run test-profiles:fill`
 * Remplissage       : `npm run test-profiles:fill -- adresse1@exemple.ch adresse2@exemple.ch`
 */
import { prisma } from "@/lib/prisma";

const PRESETS = [
  {
    heightCm: 168,
    bodyType: "ATHLETIC",
    hairColor: "BROWN",
    eyeColor: "GREEN",
    origin: "SOUTHERN_EUROPE",
    cupSize: "C",
    pubicHair: "SHAVED",
    tattoos: true,
    receives: true,
    travels: false,
    paymentMethods: ["CASH", "TWINT"],
    rateFrom: 250,
    clientele: ["MEN", "COUPLES"],
    services: ["gfe", "french_kiss", "erotic_massage", "69", "protected_oral", "cunnilingus", "lingerie", "role_play"],
  },
  {
    heightCm: 176,
    bodyType: "CURVY",
    hairColor: "BLONDE",
    eyeColor: "BLUE",
    origin: "EASTERN_EUROPE",
    cupSize: "E",
    pubicHair: "TRIMMED",
    tattoos: false,
    receives: true,
    travels: true,
    paymentMethods: ["CASH", "CARD"],
    rateFrom: 400,
    clientele: ["MEN", "WOMEN"],
    services: ["gfe", "striptease", "soft_domination", "fetishism", "sex_toys", "duo", "body_to_body", "dinner_date"],
  },
] as const;

const CHANNEL_FIELDS = [
  ["WHATSAPP", "whatsapp"],
  ["PHONE", "phone"],
  ["EMAIL", "email"],
  ["INSTAGRAM", "instagram"],
] as const;

async function listProviders() {
  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", providerProfile: { isNot: null } },
    select: { email: true, providerProfile: { select: { displayName: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (providers.length === 0) {
    console.log("Aucun compte prestataire avec un profil : créez-en un via « Inscription » d'abord.");
    return;
  }
  console.log("Comptes prestataires avec un profil :");
  for (const p of providers) {
    console.log(`  ${p.email.padEnd(36)} ${p.providerProfile!.displayName.padEnd(16)} ${p.providerProfile!.status}`);
  }
  console.log("\nPour compléter un ou deux de ces profils :");
  console.log("  npm run test-profiles:fill -- adresse1 adresse2\n");
}

async function fill(email: string, index: number) {
  const preset = PRESETS[index % PRESETS.length]!;
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { providerProfile: { include: { contact: true, services: true } } },
  });
  const profile = user?.providerProfile;
  if (!user || user.role !== "PROVIDER" || !profile) {
    console.log(`✗ ${email} : aucun compte prestataire avec un profil à cette adresse — ignoré.`);
    return;
  }

  // Canaux réellement renseignés à l'étape Contact (sinon WhatsApp, demandé à l'inscription).
  const filledChannels = CHANNEL_FIELDS.filter(([, field]) => !!profile.contact?.[field]).map(([key]) => key);
  const services = await prisma.service.findMany({ where: { key: { in: [...preset.services] }, isActive: true } });

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      heightCm: profile.heightCm ?? preset.heightCm,
      bodyType: profile.bodyType ?? preset.bodyType,
      hairColor: profile.hairColor ?? preset.hairColor,
      eyeColor: profile.eyeColor ?? preset.eyeColor,
      origin: profile.origin ?? preset.origin,
      cupSize: profile.cupSize ?? preset.cupSize,
      pubicHair: profile.pubicHair ?? preset.pubicHair,
      tattoos: profile.tattoos ?? preset.tattoos,
      ...(profile.receives || profile.travels ? {} : { receives: preset.receives, travels: preset.travels }),
      paymentMethods: profile.paymentMethods.length > 0 ? profile.paymentMethods : [...preset.paymentMethods],
      contactMethods:
        profile.contactMethods.length > 0
          ? profile.contactMethods
          : filledChannels.length > 0
            ? filledChannels
            : ["WHATSAPP"],
      rateFrom: profile.rateFrom ?? preset.rateFrom,
      clientele: profile.clientele.length > 0 ? profile.clientele : [...preset.clientele],
      ...(profile.services.length > 0
        ? {}
        : { services: { create: services.map((service) => ({ serviceId: service.id })) } }),
    },
  });

  const note = profile.status === "PUBLISHED" ? "" : ` — profil ${profile.status} : visible dans l'annuaire seulement une fois validé par l'admin`;
  console.log(`✓ ${email} (${profile.displayName}) complété${note}.`);
}

async function main() {
  const emails = process.argv.slice(2).filter((arg) => arg.includes("@"));
  if (emails.length === 0) return listProviders();
  for (const [index, email] of emails.entries()) await fill(email, index);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
