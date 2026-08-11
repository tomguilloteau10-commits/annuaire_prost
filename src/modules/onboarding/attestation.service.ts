import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip-hash";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";

export interface RecordAttestationInput {
  providerId: string;
  attestedAdult: boolean;
  attestedVoluntary: boolean;
  attestedAuthorizedToWorkInSwitzerland: boolean;
  attestedCantonalDeclaration: boolean;
  requesterIp: string | null;
}

export class AttestationIncompleteError extends Error {
  constructor() {
    super("Les quatre cases de l'attestation doivent être cochées");
    this.name = "AttestationIncompleteError";
  }
}

/**
 * Enregistre l'attestation d'onboarding (horodatée, non modifiable
 * ensuite — c'est une preuve de consentement à un instant donné, pas un
 * réglage). Bloquant pour toute publication au même titre que la
 * vérification 18+ : voir modules/profiles/profile.service.ts
 * `submitProfileForReview`.
 */
export async function recordOnboardingAttestation(input: RecordAttestationInput) {
  if (
    !input.attestedAdult ||
    !input.attestedVoluntary ||
    !input.attestedAuthorizedToWorkInSwitzerland ||
    !input.attestedCantonalDeclaration
  ) {
    throw new AttestationIncompleteError();
  }

  const existing = await prisma.onboardingAttestation.findUnique({
    where: { providerId: input.providerId },
  });
  if (existing) return existing; // déjà attestée : idempotent, on ne réécrit pas un horodatage existant.

  return prisma.onboardingAttestation.create({
    data: {
      providerId: input.providerId,
      attestedAdult: input.attestedAdult,
      attestedVoluntary: input.attestedVoluntary,
      attestedAuthorizedToWorkInSwitzerland: input.attestedAuthorizedToWorkInSwitzerland,
      attestedCantonalDeclaration: input.attestedCantonalDeclaration,
      attestedAt: new Date(),
      ipHash: input.requesterIp ? hashIp(input.requesterIp) : null,
      ipHashPurgeAt: input.requesterIp
        ? await computePurgeAt(DATA_CATEGORIES.ONBOARDING_ATTESTATION_IP_HASH)
        : null,
    },
  });
}

export async function hasCompletedOnboardingAttestation(providerId: string): Promise<boolean> {
  const attestation = await prisma.onboardingAttestation.findUnique({ where: { providerId } });
  return attestation !== null;
}
