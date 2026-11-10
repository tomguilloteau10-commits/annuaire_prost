/**
 * Règles de l'abonnement (module pur, sans accès base) : la seule source de
 * vérité sur « quel est le statut aujourd'hui ? » et « le profil est-il
 * visible dans l'annuaire ? ». Tout se déduit des dates : le statut affiché
 * est juste même si la mise à jour périodique n'est pas encore passée.
 *
 * Aucun paiement en ligne : l'admin enregistre « payé » après un règlement
 * fait hors plateforme (facture, TWINT, virement) — ENGINEERING_RULES.md §4.
 */

export const TRIAL_DAYS = 30;
/** Durée ajoutée par « Marquer comme payé ». */
export const PAID_PERIOD_DAYS = 30;
/**
 * Délai de grâce après une échéance non réglée : le profil reste visible
 * (avec le message « réglez votre abonnement »), puis il est retiré de
 * l'annuaire — jamais supprimé.
 */
export const PAYMENT_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

export type SubscriptionState = "TRIAL" | "PAYMENT_DUE" | "ACTIVE" | "PAUSED";

export interface SubscriptionDates {
  trialEndsAt: Date;
  paidUntil: Date | null;
  pausedAt: Date | null;
}

export interface SubscriptionView {
  status: SubscriptionState;
  /** Date clé à afficher : fin d'essai, échéance (dû depuis), fin de période payée, mise en pause. */
  keyDate: Date;
  /** Visible dans l'annuaire public (si le profil est par ailleurs publié par la modération). */
  listed: boolean;
  /** Paiement dû : date à laquelle le profil sera retiré de l'annuaire (ou l'a été). */
  hiddenFrom: Date | null;
}

/** Fin de la période couverte : période payée si elle existe, sinon l'essai. */
export function accessEndsAt({ trialEndsAt, paidUntil }: SubscriptionDates): Date {
  return paidUntil ?? trialEndsAt;
}

export function describeSubscription(sub: SubscriptionDates, now: Date = new Date()): SubscriptionView {
  if (sub.pausedAt) return { status: "PAUSED", keyDate: sub.pausedAt, listed: false, hiddenFrom: sub.pausedAt };

  const end = accessEndsAt(sub);
  if (end > now) {
    return { status: sub.paidUntil ? "ACTIVE" : "TRIAL", keyDate: end, listed: true, hiddenFrom: null };
  }
  const hiddenFrom = addDays(end, PAYMENT_GRACE_DAYS);
  return { status: "PAYMENT_DUE", keyDate: end, listed: hiddenFrom > now, hiddenFrom };
}

/**
 * « Marquer comme payé » : 30 jours d'abonnement actif. Les jours encore
 * couverts (essai ou période payée en cours) ne sont pas perdus : la
 * nouvelle période commence à leur fin. Après un retard ou une pause, elle
 * commence aujourd'hui.
 */
export function nextPaidUntil(sub: SubscriptionDates, now: Date = new Date()): Date {
  const end = accessEndsAt(sub);
  const start = !sub.pausedAt && end > now ? end : now;
  return addDays(start, PAID_PERIOD_DAYS);
}

/**
 * Condition « abonnement visible » sur les dates, pour la base de données :
 * pas en pause, et période couverte (+ délai de grâce) pas encore finie.
 * Doit rester équivalente à `describeSubscription(...).listed`
 * (vérifié par tests/modules/subscriptions/subscription-rules.test.ts).
 */
export function listedSubscriptionWhere(now: Date = new Date()) {
  const cutoff = addDays(now, -PAYMENT_GRACE_DAYS);
  return {
    pausedAt: null,
    OR: [{ paidUntil: { gt: cutoff } }, { paidUntil: null, trialEndsAt: { gt: cutoff } }],
  };
}
