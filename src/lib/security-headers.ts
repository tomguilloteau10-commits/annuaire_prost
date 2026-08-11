// En-têtes de sécurité appliqués à chaque réponse par le middleware.
//
// script-src utilise un nonce par requête (voir buildContentSecurityPolicy)
// plutôt que 'unsafe-inline' : Next.js App Router injecte lui-même des
// <script> inline pour le streaming SSR et l'hydratation, qu'une CSP
// `script-src 'self'` nue bloquerait entièrement (constaté en testant la
// page profil dans un vrai navigateur : hydratation cassée, page blanche
// après navigation client). Le nonce est généré dans le middleware et
// propagé à la fois sur la réponse (pour que le navigateur l'applique) et
// sur les en-têtes de la requête transmise au renderer (pour que Next.js
// l'utilise automatiquement sur ses propres scripts injectés) — voir
// https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function applySecurityHeaders(headers: Headers, csp: string): void {
  headers.set("Content-Security-Policy", csp);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}
