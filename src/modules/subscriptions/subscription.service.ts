import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/moderation/audit-log.service";
import {
  TRIAL_DAYS,
  accessEndsAt,
  addDays,
  describeSubscription,
  nextPaidUntil,
  type SubscriptionView,
} from "./subscription-rules";

/**
 * Abonnement de publicité, réglé hors plateforme. Ce service ne fait que
 * des changements de statut et de dates : aucun montant, aucun moyen de
 * paiement, aucune donnée bancaire (ENGINEERING_RULES.md §4).
 */

/** Données de création de l'essai gratuit, à imbriquer dans la création du profil. */
export function trialSubscriptionData(now: Date = new Date()) {
  return { status: "TRIAL" as const, trialEndsAt: addDays(now, TRIAL_DAYS) };
}

/** Abonnement d'un profil, créé en essai s'il manque (profil antérieur à la fonctionnalité). */
export async function ensureSubscription(profileId: string) {
  return prisma.subscription.upsert({
    where: { profileId },
    update: {},
    create: { profileId, ...trialSubscriptionData() },
  });
}

/** Statut à afficher à la prestataire ; `wasPaid` : au moins un paiement déjà enregistré. */
export async function getSubscriptionView(
  profileId: string,
  now: Date = new Date(),
): Promise<SubscriptionView & { wasPaid: boolean }> {
  const subscription = await ensureSubscription(profileId);
  return { ...describeSubscription(subscription, now), wasPaid: subscription.lastPaymentAt !== null };
}

/**
 * Remet le statut enregistré en accord avec les dates (essai ou période
 * payée terminés → « Paiement dû »). Le statut affiché et la visibilité se
 * déduisent déjà des dates : ceci tient surtout la vue admin à jour.
 * Appelée périodiquement (src/instrumentation-node.ts) et à l'ouverture de
 * la vue admin.
 */
export async function refreshSubscriptionStatuses(now: Date = new Date()): Promise<number> {
  const ended = await prisma.subscription.findMany({
    where: {
      pausedAt: null,
      status: { in: ["TRIAL", "ACTIVE"] },
      OR: [{ paidUntil: { lte: now } }, { paidUntil: null, trialEndsAt: { lte: now } }],
    },
  });
  for (const sub of ended) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAYMENT_DUE", paymentDueSince: accessEndsAt(sub) },
    });
  }
  return ended.length;
}

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super("Abonnement introuvable");
    this.name = "SubscriptionNotFoundError";
  }
}

/**
 * « Marquer comme payé » (admin) : 30 jours d'abonnement actif, la pause
 * est levée et le profil redevient visible — s'il est validé par la
 * modération : un paiement ne remplace jamais la vérification d'âge ni la
 * modération (§2).
 */
export async function markSubscriptionPaid(profileId: string, adminId: string, now: Date = new Date()) {
  const sub = await prisma.subscription.findUnique({ where: { profileId } });
  if (!sub) throw new SubscriptionNotFoundError();
  const paidUntil = nextPaidUntil(sub, now);
  const updated = await prisma.subscription.update({
    where: { profileId },
    data: { status: "ACTIVE", paidUntil, lastPaymentAt: now, paymentDueSince: null, pausedAt: null },
  });
  await recordAuditLog({
    actorId: adminId,
    action: "subscription.mark_paid",
    targetType: "PROVIDER_PROFILE",
    targetId: profileId,
    metadata: { paidUntil: paidUntil.toISOString() },
  });
  return updated;
}

/** « Mettre en pause » (admin) : le profil quitte l'annuaire, rien n'est supprimé. */
export async function pauseSubscription(profileId: string, adminId: string, now: Date = new Date()) {
  const sub = await prisma.subscription.findUnique({ where: { profileId } });
  if (!sub) throw new SubscriptionNotFoundError();
  const updated = await prisma.subscription.update({
    where: { profileId },
    data: { status: "PAUSED", pausedAt: sub.pausedAt ?? now },
  });
  await recordAuditLog({
    actorId: adminId,
    action: "subscription.pause",
    targetType: "PROVIDER_PROFILE",
    targetId: profileId,
  });
  return updated;
}

/** Vue admin : chaque prestataire avec un profil, son abonnement et sa visibilité. */
export async function listSubscriptionsForAdmin(now: Date = new Date()) {
  await refreshSubscriptionStatuses(now);
  const profiles = await prisma.providerProfile.findMany({
    select: {
      id: true,
      slug: true,
      displayName: true,
      status: true,
      user: { select: { email: true } },
      city: { select: { name: true } },
      subscription: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const rows = await Promise.all(
    profiles.map(async (profile) => {
      const subscription = profile.subscription ?? (await ensureSubscription(profile.id));
      const view = describeSubscription(subscription, now);
      return {
        profileId: profile.id,
        slug: profile.slug,
        displayName: profile.displayName,
        email: profile.user.email,
        city: profile.city.name,
        profileStatus: profile.status,
        lastPaymentAt: subscription.lastPaymentAt,
        ...view,
        visible: view.listed && profile.status === "PUBLISHED",
      };
    }),
  );
  // Ce qui demande une action d'abord : paiements dus (les plus anciens en
  // premier), puis essais qui se terminent, puis le reste.
  const order = { PAYMENT_DUE: 0, TRIAL: 1, ACTIVE: 2, PAUSED: 3 } as const;
  return rows.sort((a, b) => order[a.status] - order[b.status] || a.keyDate.getTime() - b.keyDate.getTime());
}

export async function countPaymentsDue(now: Date = new Date()): Promise<number> {
  const rows = await prisma.subscription.findMany({ select: { trialEndsAt: true, paidUntil: true, pausedAt: true } });
  return rows.filter((sub) => describeSubscription(sub, now).status === "PAYMENT_DUE").length;
}
