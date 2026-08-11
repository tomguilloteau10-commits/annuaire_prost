import { NextResponse } from "next/server";
import { revealContact } from "@/modules/profiles/contact-reveal.service";
import { checkCsrf } from "@/lib/route-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIp, extractClientIp } from "@/lib/ip-hash";

// Le SEUL endpoint qui renvoie un contact. Jamais dans le HTML initial ni
// dans une réponse de liste (ENGINEERING_RULES.md §5) — appelé à la
// demande, au clic sur "Afficher le contact". Anonyme (pas d'auth requise
// : un visiteur non connecté doit pouvoir contacter une annonceuse), donc
// protégé par rate limiting sur l'IP plutôt que par un compte.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const clientIp = extractClientIp(request);
  const rateLimit = checkRateLimit({
    key: `contact-reveal:${clientIp ? hashIp(clientIp) : "unknown"}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { slug } = await params;
  const contact = await revealContact(slug, clientIp);
  if (!contact) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}
