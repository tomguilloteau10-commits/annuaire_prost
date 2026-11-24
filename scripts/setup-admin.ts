/* eslint-disable no-console */
/**
 * Crée le VRAI compte admin (votre adresse e-mail) avec un mot de passe fort
 * et aléatoire, affiché une seule fois, puis supprime le compte admin de
 * démonstration admin@example.test (dont le mot de passe est public).
 * L'historique éventuel du compte de démonstration (décisions de
 * modération, journal) est rattaché au nouveau compte, rien ne se perd.
 *
 * Usage : `npm run admin:setup -- votre@adresse.ch`
 * Dans Docker : `docker compose exec app npm run admin:setup -- votre@adresse.ch`
 *
 * Relancé avec la même adresse : génère simplement un nouveau mot de passe.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth/password";

const DEMO_ADMIN_EMAIL = "admin@example.test";

function strongPassword(): string {
  // 24 caractères lisibles (sans 0/O ni 1/l), ~140 bits d'aléa.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...randomBytes(24)].map((byte) => alphabet[byte % alphabet.length]).join("");
}

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === DEMO_ADMIN_EMAIL) {
    console.log("Indiquez votre vraie adresse e-mail : npm run admin:setup -- votre@adresse.ch");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing && existing.role !== "ADMIN") {
    console.log(`L'adresse ${email} est déjà utilisée par un compte prestataire. Choisissez une autre adresse.`);
    process.exitCode = 1;
    return;
  }

  const password = strongPassword();
  const passwordHash = await hashPassword(password);
  const admin = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } })
    : await prisma.user.create({ data: { email, passwordHash, role: "ADMIN" } });
  await prisma.session.deleteMany({ where: { userId: admin.id } });

  const demo = await prisma.user.findUnique({ where: { email: DEMO_ADMIN_EMAIL } });
  if (demo && demo.id !== admin.id) {
    await prisma.$transaction([
      prisma.moderationAction.updateMany({ where: { moderatorId: demo.id }, data: { moderatorId: admin.id } }),
      prisma.auditLog.updateMany({ where: { actorId: demo.id }, data: { actorId: admin.id } }),
      prisma.user.delete({ where: { id: demo.id } }),
    ]);
  }

  console.log(`\nCompte admin : ${admin.email}`);
  console.log(`Mot de passe :\n\n    ${password}\n`);
  console.log("Notez-le maintenant (gestionnaire de mots de passe) : il ne sera plus affiché.");
  console.log(
    demo && demo.id !== admin.id
      ? `Le compte de démonstration ${DEMO_ADMIN_EMAIL} a été supprimé.\n`
      : "Aucun compte de démonstration à supprimer.\n",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
