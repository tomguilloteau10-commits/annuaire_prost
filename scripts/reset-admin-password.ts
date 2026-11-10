/* eslint-disable no-console */
/**
 * Donne un nouveau mot de passe fort et aléatoire à un compte ADMIN, et
 * déconnecte toutes ses sessions ouvertes. Le mot de passe est affiché une
 * seule fois : notez-le (gestionnaire de mots de passe).
 *
 * Usage : `npm run admin:reset-password` (compte admin@example.test)
 *         `npm run admin:reset-password -- autre-admin@exemple.ch`
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth/password";

async function main() {
  const email = (process.argv[2] ?? "admin@example.test").trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user || user.role !== "ADMIN") {
    console.log(`Aucun compte admin avec l'adresse ${email}.`);
    process.exitCode = 1;
    return;
  }
  // 24 caractères lisibles (sans 0/O ni 1/l), ~140 bits d'aléa.
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const password = [...randomBytes(24)].map((byte) => alphabet[byte % alphabet.length]).join("");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log(`\nNouveau mot de passe de ${user.email} :\n\n    ${password}\n`);
  console.log(`(${count} session(s) déconnectée(s). Ce mot de passe ne sera plus affiché.)\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
