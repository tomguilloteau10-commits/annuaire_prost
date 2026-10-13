import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/moderation/audit-log.service";
import type { ReportReason } from "@prisma/client";

export const REPORT_REASONS = ["UNDERAGE", "COERCION", "FAKE_PROFILE", "SCAM", "OTHER"] as const;

// Ordre de traitement : les signalements touchant à la majorité ou à la
// contrainte passent avant tout le reste.
const REASON_PRIORITY: Record<ReportReason, number> = {
  UNDERAGE: 0,
  COERCION: 1,
  FAKE_PROFILE: 2,
  SCAM: 3,
  OTHER: 4,
};

export interface CreateProfileReportInput {
  slug: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Enregistre le signalement d'un visiteur (anonyme, sans compte). Ne
 * déclenche AUCUNE action sur le profil (ENGINEERING_RULES.md §7) : il
 * entre dans la file, un humain décide. Rien n'est stocké sur l'auteur.
 * Renvoie null si le profil n'existe pas ou n'est pas publié.
 */
export async function createProfileReport({ slug, reason, details }: CreateProfileReportInput) {
  const profile = await prisma.providerProfile.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!profile) return null;

  const trimmedDetails = details?.trim();
  return prisma.profileReport.create({
    data: { profileId: profile.id, reason, details: trimmedDetails ? trimmedDetails : null },
    select: { id: true },
  });
}

/** Signalements ouverts, les plus graves d'abord puis les plus anciens. */
export async function listOpenReports() {
  const reports = await prisma.profileReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: { profile: { select: { id: true, slug: true, displayName: true, status: true } } },
  });
  return reports.sort((a, b) => REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason]);
}

export class ReportResolutionNoteRequiredError extends Error {
  constructor() {
    super("Une note est obligatoire pour clore un signalement");
    this.name = "ReportResolutionNoteRequiredError";
  }
}

export interface ResolveReportInput {
  reportId: string;
  moderatorId: string;
  note: string;
}

/**
 * Clôt un signalement après examen humain, avec une note obligatoire, et
 * le journalise (§7). Les éventuelles mesures sur le profil lui-même
 * restent des décisions de modération distinctes. Renvoie false si le
 * signalement n'existe pas ou est déjà clos.
 */
export async function resolveReport({ reportId, moderatorId, note }: ResolveReportInput): Promise<boolean> {
  if (!note || note.trim().length === 0) throw new ReportResolutionNoteRequiredError();

  const report = await prisma.profileReport.findUnique({
    where: { id: reportId },
    select: { profileId: true, reason: true },
  });
  if (!report) return false;

  const { count } = await prisma.profileReport.updateMany({
    where: { id: reportId, status: "OPEN" },
    data: { status: "RESOLVED", resolvedById: moderatorId, resolutionNote: note.trim(), resolvedAt: new Date() },
  });
  if (count === 0) return false;

  await recordAuditLog({
    actorId: moderatorId,
    action: "report.resolve",
    targetType: "ProfileReport",
    targetId: reportId,
    metadata: { profileId: report.profileId, reason: report.reason, note: note.trim() },
  });
  return true;
}
