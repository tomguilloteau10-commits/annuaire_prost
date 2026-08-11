import { prisma } from "@/lib/prisma";
import { redactSensitiveFields } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export interface RecordAuditLogInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Toute action d'administration/modération passe par ici
 * (ENGINEERING_RULES.md §7 : chaque décision produit une raison et est
 * journalisée). `metadata` est assaini avant écriture avec la même liste
 * de champs sensibles que le logger applicatif, en défense en profondeur —
 * l'appelant ne devrait de toute façon jamais y mettre de contact brut.
 */
export async function recordAuditLog(input: RecordAuditLogInput) {
  const safeMetadata = input.metadata
    ? (redactSensitiveFields(input.metadata) as Prisma.InputJsonValue)
    : undefined;

  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: safeMetadata,
    },
  });
}
