import { prisma } from "@/lib/prisma";

/**
 * Politique de rétention/purge — voir ENGINEERING_RULES.md "Politique de
 * rétention/purge — vue d'ensemble" et `model DataRetentionPolicy` dans
 * prisma/schema.prisma.
 *
 * Les durées sont éditables en base (table DataRetentionPolicy, pas en
 * dur dans le code) pour qu'un changement de politique n'exige pas de
 * déploiement. Les constantes ci-dessous ne sont que les valeurs par
 * défaut utilisées tant qu'aucune ligne n'existe encore en base (ex: juste
 * après une migration, avant le premier seed).
 */
export const DATA_CATEGORIES = {
  SESSION_IP_HASH: "session_ip_hash",
  ONBOARDING_ATTESTATION_IP_HASH: "onboarding_attestation_ip_hash",
  CONTACT_REVEAL_LOG: "contact_reveal_log",
  VERIFICATION_RECORD_AUDIT: "verification_record_audit",
  MEDIA_REJECTED: "media_rejected",
} as const;

export type DataCategory = (typeof DATA_CATEGORIES)[keyof typeof DATA_CATEGORIES];

const DEFAULT_RETENTION_DAYS: Record<DataCategory, number> = {
  [DATA_CATEGORIES.SESSION_IP_HASH]: 90,
  [DATA_CATEGORIES.ONBOARDING_ATTESTATION_IP_HASH]: 90,
  [DATA_CATEGORIES.CONTACT_REVEAL_LOG]: 30,
  [DATA_CATEGORIES.VERIFICATION_RECORD_AUDIT]: 730,
  [DATA_CATEGORIES.MEDIA_REJECTED]: 30,
};

export async function getRetentionDays(category: DataCategory): Promise<number> {
  const policy = await prisma.dataRetentionPolicy.findUnique({
    where: { dataCategory: category },
  });
  return policy?.retentionDays ?? DEFAULT_RETENTION_DAYS[category];
}

export async function computePurgeAt(category: DataCategory, from: Date = new Date()): Promise<Date> {
  const days = await getRetentionDays(category);
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
