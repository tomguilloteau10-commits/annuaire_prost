/* eslint-disable no-console */
/**
 * Supprime les comptes prestataires FICTIFS créés par le seed (profils de
 * démonstration) et tout ce qui leur est rattaché : profil, photos (base
 * ET fichiers), contact, vérification, attestation, sessions, journal de
 * leurs propres actions.
 *
 * Règles de sécurité :
 * - un compte n'est supprimé que si son ADRESSE DE CONNEXION figure dans
 *   scripts/lib/demo-accounts.ts — jamais sur la base d'un prénom ;
 * - un compte ADMIN n'est jamais supprimé ;
 * - sans l'option --confirm, le script n'efface rien : il affiche ce qui
 *   serait supprimé et ce qui serait conservé.
 *
 * Aperçu   : `npm run demo:remove`
 * Suppression : `npm run demo:remove -- --confirm`
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isDemoProviderEmail } from "./lib/demo-accounts";

const MEDIA_LOCAL_PATH = process.env.MEDIA_LOCAL_PATH ?? "./storage/media";
const confirmed = process.argv.includes("--confirm");

function describe(u: { email: string; role: string; providerProfile: { displayName: string } | null }) {
  return `${u.email.padEnd(34)} ${u.role.padEnd(9)} ${u.providerProfile?.displayName ?? "(pas de profil)"}`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      providerProfile: { select: { id: true, displayName: true, media: { select: { storageKey: true } } } },
    },
    orderBy: { email: "asc" },
  });

  const toDelete = users.filter((u) => u.role !== "ADMIN" && isDemoProviderEmail(u.email));
  const kept = users.filter((u) => !toDelete.includes(u));

  console.log(`\nÀ SUPPRIMER — comptes fictifs (${toDelete.length}) :`);
  for (const u of toDelete) console.log("  ✗ " + describe(u));
  console.log(`\nCONSERVÉS (${kept.length}) :`);
  for (const u of kept) console.log("  ✓ " + describe(u));

  if (!confirmed) {
    console.log("\nAperçu seulement : rien n'a été supprimé.");
    console.log("Pour supprimer réellement : npm run demo:remove -- --confirm\n");
    return;
  }
  if (toDelete.length === 0) {
    console.log("\nAucun compte fictif à supprimer.\n");
    return;
  }

  const userIds = toDelete.map((u) => u.id);
  const profileIds = toDelete.flatMap((u) => (u.providerProfile ? [u.providerProfile.id] : []));
  const storageKeys = toDelete.flatMap((u) => u.providerProfile?.media.map((m) => m.storageKey) ?? []);

  // Tout ou rien : le reste (profil, photos, contact, vérification,
  // attestation, sessions…) suit par suppression en cascade du compte.
  await prisma.$transaction([
    prisma.contactRevealLog.deleteMany({ where: { profileId: { in: profileIds } } }),
    prisma.moderationAction.deleteMany({ where: { moderatorId: { in: userIds } } }),
    prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);

  // Fichiers photo des profils supprimés (après la base : un fichier
  // orphelin est inoffensif, une photo en base sans fichier ne l'est pas).
  for (const key of storageKeys) {
    await rm(path.join(MEDIA_LOCAL_PATH, path.basename(key)), { force: true });
  }

  const remaining = await prisma.user.findMany({ select: { email: true }, orderBy: { email: "asc" } });
  console.log(`\nSupprimé : ${toDelete.length} compte(s) fictif(s), ${profileIds.length} profil(s), ${storageKeys.length} photo(s).`);
  console.log(`Comptes restants (${remaining.length}) : ${remaining.map((u) => u.email).join(", ")}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
