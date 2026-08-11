/**
 * Seed de fondation — pas le seed de démo complet.
 *
 * Ce script ne crée que les données de référence sans lesquelles l'app ne
 * peut pas fonctionner du tout (ex: ProviderProfile.planId est une clé
 * étrangère obligatoire, donc au moins un Plan doit exister avant de créer
 * un profil). Il n'insère aucun profil, taxonomie de démonstration ni
 * donnée fictive de test — ça arrive dans une étape dédiée ("seed
 * synthétique") avec 2-3 profils fictifs et des images placeholder, voir
 * ENGINEERING_RULES.md et docs/ARCHITECTURE.md.
 */
import { PrismaClient } from "@prisma/client";
import { DATA_CATEGORIES } from "../src/modules/retention/retention-policy.service";

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

async function main() {
  await seedFounderPlan();
  await seedRetentionPolicies();
  await seedAllowedCountries();
  // eslint-disable-next-line no-console
  console.log("Seed de fondation terminé (Plan founder, politiques de rétention, pays autorisés).");
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
