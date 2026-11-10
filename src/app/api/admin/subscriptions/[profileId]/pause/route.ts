import { NextResponse } from "next/server";
import { requireRole, checkCsrf } from "@/lib/route-helpers";
import { pauseSubscription, SubscriptionNotFoundError } from "@/modules/subscriptions/subscription.service";

// « Mettre en pause » : le profil quitte l'annuaire public ; rien n'est supprimé,
// la prestataire peut toujours le modifier. Rôle ADMIN uniquement.
export async function POST(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const guard = await requireRole(["ADMIN"]);
  if (guard.error) return guard.error;

  const { profileId } = await params;
  try {
    const subscription = await pauseSubscription(profileId, guard.user.id);
    return NextResponse.json({ status: subscription.status, paidUntil: subscription.paidUntil });
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
