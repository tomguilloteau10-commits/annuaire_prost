import { createHmac } from "node:crypto";
import { getEnv } from "./env";

/**
 * Hash salé d'une adresse IP (HMAC-SHA256, secret d'application). Ne
 * stockez et ne loggez jamais une IP en clair — voir ENGINEERING_RULES.md
 * §5 "Hashage des IP". Un hash non salé serait cassable par force brute
 * étant donné le faible espace des adresses IPv4 ; c'est pourquoi on ne
 * fournit pas de fonction de hash "simple" à côté de celle-ci.
 */
export function hashIp(ip: string): string {
  const { APP_IP_HASH_SECRET } = getEnv();
  return createHmac("sha256", APP_IP_HASH_SECRET).update(ip).digest("hex");
}

/** Extrait l'IP cliente d'une requête, en tenant compte d'un éventuel proxy. */
export function extractClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}
