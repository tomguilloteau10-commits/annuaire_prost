import type { Prisma } from "@prisma/client";
import { listedSubscriptionWhere } from "./subscription-rules";

/**
 * Condition unique « visible par le public » : profil validé par la
 * modération (PUBLISHED, qui exige la majorité vérifiée — §2) ET abonnement
 * à jour (essai, actif, ou délai de grâce ; jamais en pause). Utilisée par
 * TOUTES les lectures publiques : annuaire, page profil, carte, salons,
 * révélation du contact, signalement. Un profil masqué n'est ni supprimé
 * ni modifié : il redevient visible dès que l'abonnement est réglé.
 */
export function publiclyVisibleProfileWhere(now: Date = new Date()): Prisma.ProviderProfileWhereInput {
  return { status: "PUBLISHED", subscription: { is: listedSubscriptionWhere(now) } };
}
