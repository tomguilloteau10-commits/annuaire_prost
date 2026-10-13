"use client";
import { useEffect, useState } from "react";

// État module-level partagé par toutes les instances du hook sur la même
// page : plusieurs composants (ex: bouton WhatsApp + révélation du contact
// sur la même fiche profil) peuvent monter simultanément, et chacun
// appelait auparavant sa propre /api/csrf. `ensureCsrfCookie()` étant
// "lire le cookie existant, sinon en écrire un nouveau", deux requêtes
// concurrentes qui démarrent avant que l'une ou l'autre n'ait posé son
// Set-Cookie se voient chacune sans cookie existant et génèrent chacune un
// jeton différent — le second Set-Cookie écrase le premier, et le
// composant qui a reçu le premier jeton envoie alors un en-tête qui ne
// correspond plus au cookie (403 csrf_invalid). Partager un seul appel en
// vol (et son résultat) entre toutes les instances élimine la course.
let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;
const listeners = new Set<(token: string) => void>();

function fetchCsrfToken(): Promise<string> {
  if (cachedToken) return Promise.resolve(cachedToken);
  if (!pendingFetch) {
    pendingFetch = fetch("/api/csrf")
      .then((res) => res.json())
      .then((data: { csrfToken: string }) => {
        cachedToken = data.csrfToken;
        listeners.forEach((listener) => listener(data.csrfToken));
        return data.csrfToken;
      })
      .finally(() => {
        pendingFetch = null;
      });
  }
  return pendingFetch;
}

/**
 * Récupère le jeton CSRF (voir src/lib/csrf.ts) au montage d'un composant
 * client contenant un formulaire de mutation. Le cookie est posé par
 * /api/csrf ; ce hook renvoie la valeur à renvoyer dans l'en-tête
 * x-csrf-token de chaque POST/PUT/PATCH/DELETE.
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(cachedToken);

  useEffect(() => {
    if (cachedToken) {
      setToken(cachedToken);
      return;
    }
    let cancelled = false;
    listeners.add(setToken);
    fetchCsrfToken()
      .then((value) => {
        if (!cancelled) setToken(value);
      })
      .catch(() => {
        /* le formulaire affichera l'erreur renvoyée par le POST si le jeton manque */
      });
    return () => {
      cancelled = true;
      listeners.delete(setToken);
    };
  }, []);

  return token;
}
