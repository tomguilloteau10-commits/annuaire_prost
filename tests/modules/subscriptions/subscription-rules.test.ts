import { describe, expect, it } from "vitest";
import {
  PAYMENT_GRACE_DAYS,
  TRIAL_DAYS,
  addDays,
  describeSubscription,
  nextPaidUntil,
} from "@/modules/subscriptions/subscription-rules";

const now = new Date("2026-06-15T12:00:00Z");
const sub = (over: Partial<{ trialEndsAt: Date; paidUntil: Date | null; pausedAt: Date | null }>) => ({
  trialEndsAt: addDays(now, TRIAL_DAYS),
  paidUntil: null,
  pausedAt: null,
  ...over,
});

describe("statut de l'abonnement", () => {
  it("essai gratuit : visible jusqu'à la fin de l'essai", () => {
    const view = describeSubscription(sub({}), now);
    expect(view).toMatchObject({ status: "TRIAL", listed: true });
    expect(view.keyDate).toEqual(addDays(now, TRIAL_DAYS));
  });

  it("essai terminé sans paiement : « Paiement dû » depuis la fin de l'essai, visible pendant le délai de grâce", () => {
    const ended = addDays(now, -2);
    const view = describeSubscription(sub({ trialEndsAt: ended }), now);
    expect(view).toMatchObject({ status: "PAYMENT_DUE", listed: true });
    expect(view.keyDate).toEqual(ended);
    expect(view.hiddenFrom).toEqual(addDays(ended, PAYMENT_GRACE_DAYS));
  });

  it("paiement dû depuis trop longtemps : dépublié, jamais supprimé", () => {
    const view = describeSubscription(sub({ trialEndsAt: addDays(now, -(PAYMENT_GRACE_DAYS + 1)) }), now);
    expect(view).toMatchObject({ status: "PAYMENT_DUE", listed: false });
  });

  it("actif : visible jusqu'à l'échéance, puis « Paiement dû »", () => {
    expect(describeSubscription(sub({ trialEndsAt: addDays(now, -40), paidUntil: addDays(now, 10) }), now)).toMatchObject({
      status: "ACTIVE",
      listed: true,
    });
    expect(describeSubscription(sub({ trialEndsAt: addDays(now, -40), paidUntil: addDays(now, -1) }), now).status).toBe(
      "PAYMENT_DUE",
    );
  });

  it("en pause : dépublié immédiatement, même pendant l'essai ou une période payée", () => {
    expect(describeSubscription(sub({ pausedAt: now, paidUntil: addDays(now, 20) }), now)).toMatchObject({
      status: "PAUSED",
      listed: false,
    });
  });
});

describe("« Marquer comme payé » : 30 jours", () => {
  it("après un retard : 30 jours à partir d'aujourd'hui", () => {
    expect(nextPaidUntil(sub({ trialEndsAt: addDays(now, -5) }), now)).toEqual(addDays(now, 30));
  });

  it("pendant l'essai ou une période payée : les jours restants ne sont pas perdus", () => {
    expect(nextPaidUntil(sub({ trialEndsAt: addDays(now, 10) }), now)).toEqual(addDays(now, 40));
    expect(nextPaidUntil(sub({ trialEndsAt: addDays(now, -40), paidUntil: addDays(now, 3) }), now)).toEqual(
      addDays(now, 33),
    );
  });

  it("après une pause : 30 jours à partir d'aujourd'hui", () => {
    expect(nextPaidUntil(sub({ pausedAt: addDays(now, -3), paidUntil: addDays(now, 10) }), now)).toEqual(
      addDays(now, 30),
    );
  });
});
