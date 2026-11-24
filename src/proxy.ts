import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { applySecurityHeaders, buildContentSecurityPolicy } from "@/lib/security-headers";
import {
  AGE_COOKIE_NAME,
  AGE_GATE_SEGMENT,
  hasConfirmedAge,
  isAgeGateExempt,
  localeFromPathname,
} from "@/lib/age-gate";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

const intlMiddleware = createIntlMiddleware(routing);

// ── Géo-restriction (bêta) ──────────────────────────────────────────────
//
// La liste des pays autorisés vit en base (model AllowedCountry, éditable
// depuis l'admin) — pas en dur dans le code. Le proxy (src/proxy.ts)
// n'importe volontairement pas Prisma : il passe avant chaque page ;
// il rafraîchit périodiquement un cache en mémoire depuis une route Node.js
// interne (/api/internal/allowed-countries).
//
// ⚠️ Ceci est un stub honnête, pas une géolocalisation réelle : il lit le
// code pays dans un en-tête HTTP (nom configurable via GEO_COUNTRY_HEADER,
// "x-geo-country" par défaut). En self-hosting, ce header doit être posé
// par un reverse proxy équipé d'une base GeoIP (ex: nginx + MaxMind
// GeoLite2, ou l'en-tête natif d'un CDN comme Cloudflare : "cf-ipcountry").
// Sans ce header, la géo-restriction est un no-op (laisse passer) — choix
// délibéré pour la bêta : mieux vaut ne pas bloquer par erreur un accès
// légitime que fail-closed sur une dépendance pas encore branchée.
//
// Portée actuelle : uniquement les pages ([locale]/...), pas les routes
// /api/* (voir `config.matcher` ci-dessous) — une bêta privée non
// référencée n'a pas besoin d'un filtrage API en plus du filtrage page
// pour l'instant. À étendre si le produit s'ouvre publiquement.
const GEO_HEADER_NAME = process.env.GEO_COUNTRY_HEADER ?? "x-geo-country";
const ALLOWED_COUNTRIES_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedAllowedCountries: Set<string> | null = null;
let cacheFetchedAt = 0;

async function getAllowedCountries(origin: string): Promise<Set<string> | null> {
  const now = Date.now();
  if (cachedAllowedCountries && now - cacheFetchedAt < ALLOWED_COUNTRIES_CACHE_TTL_MS) {
    return cachedAllowedCountries;
  }
  try {
    const response = await fetch(new URL("/api/internal/allowed-countries", origin));
    if (!response.ok) return cachedAllowedCountries;
    const data = (await response.json()) as { countryCodes: string[] };
    cachedAllowedCountries = new Set(data.countryCodes);
    cacheFetchedAt = now;
    return cachedAllowedCountries;
  } catch {
    return cachedAllowedCountries; // fail-open, voir commentaire ci-dessus
  }
}

export async function proxy(request: NextRequest) {
  const countryCode = request.headers.get(GEO_HEADER_NAME);

  if (countryCode) {
    const allowedCountries = await getAllowedCountries(request.nextUrl.origin);
    if (allowedCountries && allowedCountries.size > 0 && !allowedCountries.has(countryCode)) {
      return new NextResponse("Ce service n'est pas disponible dans votre pays.", {
        status: 451,
      });
    }
  }

  // Nonce CSP par requête, propagé à la fois sur la requête transmise au
  // renderer (pour que Next.js l'applique lui-même à ses scripts injectés
  // de streaming/hydratation) et sur la réponse (pour que le navigateur
  // l'applique). Voir le commentaire dans lib/security-headers.ts.
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });

  const response = intlMiddleware(requestWithNonce);

  // Contrôle 18+ (voir lib/age-gate.ts) : tant que l'âge n'est pas confirmé,
  // la page de confirmation est servie À LA PLACE de la page demandée (même
  // adresse), donc aucun contenu de l'annuaire n'est envoyé avant. Les
  // redirections de langue de next-intl ("/" → "/fr") passent d'abord.
  const isRedirect = response.status >= 300 && response.status < 400;
  if (
    !isRedirect &&
    !hasConfirmedAge(request.cookies.get(AGE_COOKIE_NAME)?.value) &&
    !isAgeGateExempt(request.nextUrl.pathname)
  ) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = `/${localeFromPathname(gateUrl.pathname)}/${AGE_GATE_SEGMENT}`;
    gateUrl.search = "";
    const gate = NextResponse.rewrite(gateUrl, { request: { headers: requestHeaders } });
    gate.headers.set("Cache-Control", "private, no-store");
    applySecurityHeaders(gate.headers, csp);
    return gate;
  }

  applySecurityHeaders(response.headers, csp);
  return response;
}

export const config = {
  // Exclut les assets statiques, l'API (y compris la route interne
  // utilisée par ce proxy) et les fichiers avec extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
