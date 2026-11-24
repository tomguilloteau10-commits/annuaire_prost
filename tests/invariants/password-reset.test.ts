import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, uniqueEmail } from "../helpers/db";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import {
  InvalidResetTokenError,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/modules/auth/password-reset.service";

// Sans serveur SMTP, les e-mails vont dans la boîte d'envoi de test.
process.env.EMAIL_DRIVER = "outbox";

async function lastEmailTo(email: string) {
  return prisma.outboxEmail.findFirst({ where: { recipient: email }, orderBy: { createdAt: "desc" } });
}
function tokenFrom(body: string): string {
  const match = body.match(/#token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("lien absent");
  return match[1]!;
}

describe("mot de passe oublié", () => {
  const provider = { id: "", email: uniqueEmail("reset-provider") };
  const admin = { id: "", email: uniqueEmail("reset-admin") };

  beforeAll(async () => {
    const passwordHash = await hashPassword("AncienMotDePasse-2026");
    provider.id = (
      await prisma.user.create({ data: { email: provider.email, passwordHash, role: "PROVIDER" } })
    ).id;
    admin.id = (await prisma.user.create({ data: { email: admin.email, passwordHash, role: "ADMIN" } })).id;
  });

  afterAll(async () => {
    await prisma.outboxEmail.deleteMany({ where: { recipient: { in: [provider.email, admin.email] } } });
    await prisma.user.deleteMany({ where: { id: { in: [provider.id, admin.id] } } });
    await prisma.$disconnect();
  });

  it("envoie un lien à une prestataire, dans sa langue, sans stocker le jeton en clair", async () => {
    await requestPasswordReset(provider.email.toUpperCase(), "de");
    const email = await lastEmailTo(provider.email);
    expect(email?.subject).toBe("Ihr neues VelvetGirl-Passwort");
    expect(email?.body).toContain("http://localhost:3000/de/reset-password#token=");
    const token = tokenFrom(email!.body);
    const stored = await prisma.passwordResetToken.findMany({ where: { userId: provider.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]!.tokenHash).not.toContain(token);
    expect(stored[0]!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("n'envoie rien pour une adresse inconnue ni pour un compte admin", async () => {
    const before = await prisma.outboxEmail.count();
    await requestPasswordReset(uniqueEmail("personne"), "fr");
    await requestPasswordReset(admin.email, "fr");
    expect(await prisma.outboxEmail.count()).toBe(before);
    expect(await prisma.passwordResetToken.count({ where: { userId: admin.id } })).toBe(0);
  });

  it("change le mot de passe une seule fois et déconnecte les sessions ouvertes", async () => {
    await requestPasswordReset(provider.email, "fr");
    const token = tokenFrom((await lastEmailTo(provider.email))!.body);
    await prisma.session.create({
      data: {
        userId: provider.id,
        tokenHash: `session-${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await resetPasswordWithToken(token, "NouveauMotDePasse-2026");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: provider.id } });
    expect(await verifyPassword(user.passwordHash, "NouveauMotDePasse-2026")).toBe(true);
    expect(await verifyPassword(user.passwordHash, "AncienMotDePasse-2026")).toBe(false);
    expect(await prisma.session.count({ where: { userId: provider.id } })).toBe(0);

    await expect(resetPasswordWithToken(token, "EncoreUnAutre-2026")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it("annule l'ancien lien quand un nouveau est demandé, et refuse un lien expiré ou inventé", async () => {
    await requestPasswordReset(provider.email, "fr");
    const first = tokenFrom((await lastEmailTo(provider.email))!.body);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await requestPasswordReset(provider.email, "fr");
    const second = tokenFrom((await lastEmailTo(provider.email))!.body);
    expect(second).not.toBe(first);
    await expect(resetPasswordWithToken(first, "UnMotDePasse-2026xx")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );

    await prisma.passwordResetToken.updateMany({
      where: { userId: provider.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resetPasswordWithToken(second, "UnMotDePasse-2026xx")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
    await expect(resetPasswordWithToken("jeton-invente-0123456789", "UnMotDePasse-2026xx")).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });
});
