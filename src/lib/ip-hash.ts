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

/**
 * IP du visiteur, pour les limites anti-abus uniquement (jamais stockée en
 * clair).
 *
 * ⚠️ X-Forwarded-For est un en-tête que n'importe quel client peut écrire.
 * Next.js ne le remplit avec l'adresse réelle que s'il est absent : sans
 * reverse proxy de confiance devant l'app, un attaquant peut donc changer
 * d'« IP » à chaque requête. C'est pourquoi aucune protection ne repose sur
 * l'IP seule (voir lib/rate-limit.ts).
 *
 * En production derrière un reverse proxy qui AJOUTE l'adresse réelle à
 * X-Forwarded-For (nginx `$proxy_add_x_forwarded_for`, Caddy, Traefik),
 * définir TRUSTED_PROXY_HOPS au nombre de proxys (souvent 1) : l'IP est
 * alors lue à la bonne position depuis la droite, là où le client ne peut
 * pas écrire.
 */
export function extractClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const entries = forwardedFor.split(",").map((entry) => entry.trim()).filter(Boolean);
    const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? "0");
    const index = Number.isInteger(hops) && hops > 0 ? Math.max(entries.length - hops, 0) : 0;
    return entries[index] ?? null;
  }
  return request.headers.get("x-real-ip");
}
