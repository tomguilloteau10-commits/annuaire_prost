// Rate limiting fenêtre fixe, en mémoire. Suffisant pour la bêta
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
