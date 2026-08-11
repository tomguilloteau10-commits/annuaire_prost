import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { applySecurityHeaders } from "@/lib/security-headers";

const intlMiddleware = createIntlMiddleware(routing);

// ── Géo-restriction (bêta) ──────────────────────────────────────────────
//
// La liste des pays autorisés vit en base (model AllowedCountry, éditable
// depuis l'admin) — pas en dur dans le code. Le middleware tourne en
// runtime Edge et ne peut donc pas interroger Postgres/Prisma directement ;
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

export async function middleware(request: NextRequest) {
  const countryCode = request.headers.get(GEO_HEADER_NAME);

  if (countryCode) {
    const allowedCountries = await getAllowedCountries(request.nextUrl.origin);
    if (allowedCountries && allowedCountries.size > 0 && !allowedCountries.has(countryCode)) {
      return new NextResponse("Ce service n'est pas disponible dans votre pays.", {
        status: 451,
      });
    }
  }

  const response = intlMiddleware(request);
  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  // Exclut les assets statiques, l'API (y compris la route interne
  // utilisée par ce middleware) et les fichiers avec extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
