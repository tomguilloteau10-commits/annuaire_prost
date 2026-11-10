import { NextResponse } from "next/server";
import { requireRole, checkCsrf } from "@/lib/route-helpers";
import { markSubscriptionPaid, SubscriptionNotFoundError } from "@/modules/subscriptions/subscription.service";

// « Marquer comme payé » : paiement reçu HORS plateforme (facture, TWINT,
// virement). Aucun montant ni moyen de paiement n'est transmis ni stocké. Rôle ADMIN uniquement.
export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const { profileId } = await params;
  try {
    const subscription = await markSubscriptionPaid(profileId, guard.user.id);
    return NextResponse.json({ status: subscription.status, paidUntil: subscription.paidUntil });
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
