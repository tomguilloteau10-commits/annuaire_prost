/* eslint-disable no-console */
/**
 * Liste tous les comptes en base (lecture seule, ne modifie rien) :
 * adresse de connexion, rôle, nom d'affichage du profil, statut, date de
 * création, et si l'adresse est celle d'un compte fictif du seed.
 *
 * Exécution : `npm run accounts:list`
 */
import { prisma } from "@/lib/prisma";
import { isDemoProviderEmail } from "./lib/demo-accounts";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      createdAt: true,
      providerProfile: { select: { displayName: true, status: true } },
    },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  const rows = users.map((u) => ({
    "e-mail de connexion": u.email,
    rôle: u.role,
    "nom affiché": u.providerProfile?.displayName ?? "—",
    "statut du profil": u.providerProfile?.status ?? "—",
    "créé le": u.createdAt.toISOString().slice(0, 10),
    type: u.role === "ADMIN" ? "admin (conservé)" : isDemoProviderEmail(u.email) ? "FICTIF (démo)" : "autre compte",
  }));

  console.log(`${users.length} compte(s) en base :`);
  console.table(rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
