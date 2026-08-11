import "server-only";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "./env";

// Protection CSRF par double-submit cookie signé : un cookie lisible par le
// JS du même site porte un jeton signé (HMAC), renvoyé par le client dans
// l'en-tête `x-csrf-token` sur toute requête de mutation. Le serveur
// vérifie à la fois l'égalité cookie/en-tête et la signature — la
// signature empêche qu'un cookie forgé côté client (ex: via une faille XSS
// sur un sous-domaine) soit accepté sans connaître CSRF_SECRET.
export const CSRF_COOKIE_NAME = "aprost_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

function sign(nonce: string): string {
  const { CSRF_SECRET } = getEnv();
  return createHmac("sha256", CSRF_SECRET).update(nonce).digest("hex");
}

function buildToken(): string {
  const nonce = randomBytes(24).toString("hex");
  return `${nonce}.${sign(nonce)}`;
}

function isValidToken(token: string): boolean {
  const [nonce, signature] = token.split(".");
  if (!nonce || !signature) return false;
  const expected = sign(nonce);
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

/** À appeler depuis une Server Action / page pour garantir la présence du cookie CSRF. */
export function ensureCsrfCookie(): string {
  const existing = cookies().get(CSRF_COOKIE_NAME)?.value;
  if (existing && isValidToken(existing)) return existing;

  const token = buildToken();
  cookies().set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // doit être lisible par le client pour être renvoyé en en-tête
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return token;
}

/** À appeler dans chaque route handler qui mute de l'état (POST/PUT/PATCH/DELETE). */
export function assertValidCsrf(request: Request): void {
  const cookieToken = cookies().get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken || !isValidToken(cookieToken)) {
    throw new CsrfError();
  }
}

export class CsrfError extends Error {
  constructor(message = "Jeton CSRF invalide ou manquant") {
    super(message);
    this.name = "CsrfError";
  }
}
