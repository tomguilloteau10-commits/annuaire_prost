// Rate limiting fenêtre fixe, en mémoire. Suffisant pour la bêta
// (faible trafic). Les seaux par IP ne suffisent pas seuls : l'IP vient
// d'un en-tête que le client peut falsifier tant que l'app n'est pas
// derrière un reverse proxy de confiance (voir lib/ip-hash.ts). Chaque
// route sensible combine donc un seau par IP avec un seau qui n'en dépend
// pas (par compte visé, ou global).
//
// (un seul conteneur `app`, cf. docker-compose.yml) sur les endpoints
// sensibles à protéger en priorité : auth (login/register) et révélation
// de contact — voir ENGINEERING_RULES.md.
//
// ⚠️ Ne tient pas la charge derrière plusieurs instances de l'app (chaque
// instance a son propre compteur en mémoire). Le jour où l'app est
// horizontalement scalée, remplacer ce module par un backend partagé
// (Redis `INCR` + `EXPIRE`) en gardant la même signature `checkRateLimit`.

interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Identifiant unique du "seau" : combinez route + ipHash, jamais l'IP en clair. */
  key: string;
  limit: number;
  windowMs: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Le seau est-il plein ? (lecture seule, ne compte pas de tentative) */
export function isRateLimited({ key, limit }: Pick<RateLimitOptions, "key" | "limit">): boolean {
  const existing = windows.get(key);
  return !!existing && existing.resetAt > Date.now() && existing.count >= limit;
}

/** Compte une tentative sans décider (ex. un mot de passe faux). */
export function recordAttempt({ key, windowMs }: Pick<RateLimitOptions, "key" | "windowMs">): void {
  const now = Date.now();
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) windows.set(key, { count: 1, resetAt: now + windowMs });
  else existing.count += 1;
}

/** Remet un seau à zéro (ex. connexion réussie). */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

/**
 * Vérifie plusieurs seaux d'un coup (ex. par IP ET global) : la requête
 * n'est acceptée que si tous ont de la place, et n'est comptée que dans ce
 * cas — une requête refusée ne consomme pas le quota des autres seaux.
 */
export function checkRateLimits(buckets: RateLimitOptions[]): boolean {
  if (buckets.some((bucket) => isRateLimited(bucket))) return false;
  for (const bucket of buckets) recordAttempt(bucket);
  return true;
}

// Purge périodique pour éviter une fuite mémoire lente en dev longue durée.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, state] of windows) {
      if (state.resetAt <= now) windows.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();
