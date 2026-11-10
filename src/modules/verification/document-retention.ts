import { prisma } from "@/lib/prisma";

// Volontairement sans "server-only" : utilisé aussi par le job de purge
// (src/modules/retention/purge.ts), exécuté hors de Next.js.

export const MANUAL_REVIEW_PROVIDER = "manual_review";

/**
 * Supprime les pièces dont le délai maximal est dépassé sans décision, et
 * clôt le dossier correspondant (EXPIRED) : la prestataire devra déposer à
 * nouveau. Appelée à l'ouverture des files admin et par le job de purge.
 */
export async function purgeExpiredVerificationDocuments(now: Date = new Date()): Promise<number> {
  const expired = await prisma.verificationDocument.findMany({
    where: { purgeAt: { lte: now } },
    select: { providerId: true, kind: true },
  });
  if (expired.length === 0) return 0;
  const identityProviders = [...new Set(expired.filter((d) => d.kind !== "WORK_PERMIT").map((d) => d.providerId))];
  const permitProviders = [...new Set(expired.filter((d) => d.kind === "WORK_PERMIT").map((d) => d.providerId))];
  const [deleted] = await prisma.$transaction([
    prisma.verificationDocument.deleteMany({ where: { purgeAt: { lte: now } } }),
    prisma.verificationRecord.updateMany({
      where: { providerId: { in: identityProviders }, verificationProvider: MANUAL_REVIEW_PROVIDER, status: "PENDING" },
      data: { status: "EXPIRED" },
    }),
    prisma.onboardingAttestation.updateMany({
      where: { providerId: { in: permitProviders }, workPermitStatus: "PENDING" },
      data: { workPermitStatus: "NONE" },
    }),
  ]);
  return deleted.count;
}

