import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, ensureBaseFixtures, uniqueSlug, uniqueEmail, type BaseFixtures } from "../helpers/db";
import {
  createProfileReport,
  resolveReport,
  ReportResolutionNoteRequiredError,
} from "@/modules/reports/report.service";

// ENGINEERING_RULES.md §7 : un signalement alimente une file, il ne
// déclenche jamais d'action automatique sur le profil ; sa clôture exige
// une note et est journalisée.

describe("invariant: un signalement ne déclenche aucune action automatique", () => {
  let fixtures: BaseFixtures;
  let slug: string;
  let profileId: string;
  let moderatorId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fixtures = await ensureBaseFixtures();
    slug = uniqueSlug("invariant-report");

    const provider = await prisma.user.create({
      data: { email: uniqueEmail("invariant-report"), passwordHash: "not-a-real-hash", role: "PROVIDER" },
    });
    const moderator = await prisma.user.create({
      data: { email: uniqueEmail("invariant-report-mod"), passwordHash: "not-a-real-hash", role: "MODERATOR" },
    });
    createdUserIds.push(provider.id, moderator.id);
    moderatorId = moderator.id;

    const profile = await prisma.providerProfile.create({
      data: {
        userId: provider.id,
        slug,
        displayName: "Profil de test signalement",
        description: "Description de test suffisamment longue pour respecter les contraintes de validation applicatives.",
        cityId: fixtures.cityId,
        categoryId: fixtures.categoryId,
        planId: fixtures.planId,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    profileId = profile.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.category.delete({ where: { id: fixtures.categoryId } });
    await prisma.city.delete({ where: { id: fixtures.cityId } });
    await prisma.plan.delete({ where: { id: fixtures.planId } });
    await prisma.$disconnect();
  });

  it("un signalement grave laisse le profil PUBLISHED", async () => {
    const report = await createProfileReport({ slug, reason: "UNDERAGE", details: "  test  " });
    expect(report).not.toBeNull();

    const profile = await prisma.providerProfile.findUniqueOrThrow({ where: { id: profileId } });
    expect(profile.status).toBe("PUBLISHED");

    const stored = await prisma.profileReport.findUniqueOrThrow({ where: { id: report!.id } });
    expect(stored.status).toBe("OPEN");
    expect(stored.details).toBe("test");
  });

  it("refuse un signalement sur un profil inexistant ou non publié", async () => {
    expect(await createProfileReport({ slug: uniqueSlug("absent"), reason: "OTHER" })).toBeNull();
  });

  it("la clôture exige une note, est journalisée et ne se fait qu'une fois", async () => {
    const report = await createProfileReport({ slug, reason: "SCAM" });

    await expect(resolveReport({ reportId: report!.id, moderatorId, note: "   " })).rejects.toBeInstanceOf(
      ReportResolutionNoteRequiredError,
    );

    expect(await resolveReport({ reportId: report!.id, moderatorId, note: "Vérifié, rien à signaler" })).toBe(true);
    expect(await resolveReport({ reportId: report!.id, moderatorId, note: "Deuxième fois" })).toBe(false);

    const log = await prisma.auditLog.findFirst({ where: { action: "report.resolve", targetId: report!.id } });
    expect(log?.actorId).toBe(moderatorId);
  });
});
