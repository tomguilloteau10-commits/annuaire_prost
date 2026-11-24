import { createHash, randomBytes } from "node:crypto";
import { createTranslator } from "next-intl";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { hashPassword } from "@/modules/auth/password";
import { sendEmail } from "@/modules/email/email.service";

/** Durée de validité d'un lien « mot de passe oublié ». */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export class InvalidResetTokenError extends Error {
  constructor() {
    super("Lien de réinitialisation invalide, expiré ou déjà utilisé");
    this.name = "InvalidResetTokenError";
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Demande de réinitialisation. Ne révèle JAMAIS si l'adresse correspond à
 * un compte (l'appelant répond toujours la même chose). Seuls les comptes
 * prestataires sont concernés : le mot de passe admin se réinitialise
 * uniquement sur le serveur (npm run admin:reset-password).
 *
 * Le jeton n'est envoyé que par e-mail ; seul son hash est stocké. Il est
 * placé après « # » dans le lien : cette partie n'est jamais transmise au
 * serveur (ni journaux, ni en-tête Referer).
 */
export async function requestPasswordReset(rawEmail: string, locale: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "PROVIDER" },
    select: { id: true, email: true },
  });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Un seul lien valable à la fois : les précédents sont annulés.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    }),
  ]);

  // Traduction chargée directement (fonctionne aussi après la réponse HTTP,
  // hors du rendu d'une page).
  const lang = (routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale;
  const messages = (await import(`@/i18n/messages/${lang}.json`)).default;
  const t = createTranslator({ locale: lang, messages, namespace: "emails.passwordReset" });
  const link = `${appUrl()}/${lang}/reset-password#token=${token}`;
  await sendEmail({ to: user.email, subject: t("subject"), text: t("body", { link }) });
  logger.info("auth.password_reset.requested", { userId: user.id });
}

/**
 * Choix du nouveau mot de passe. Le lien ne sert qu'une fois ; toutes les
 * sessions ouvertes du compte sont fermées (si quelqu'un d'autre était
 * connecté, il est déconnecté).
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ userId: string }> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw new InvalidResetTokenError();

  const passwordHash = await hashPassword(newPassword);
  // Marquage « utilisé » conditionnel : deux envois simultanés du même lien
  // ne peuvent pas réussir tous les deux.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) throw new InvalidResetTokenError();

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  logger.info("auth.password_reset.completed", { userId: record.userId });
  return { userId: record.userId };
}
