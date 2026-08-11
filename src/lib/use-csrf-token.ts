"use client";
import { useEffect, useState } from "react";

/**
 * Récupère le jeton CSRF (voir src/lib/csrf.ts) au montage d'un composant
 * client contenant un formulaire de mutation. Le cookie est posé par
 * /api/csrf ; ce hook renvoie la valeur à renvoyer dans l'en-tête
 * x-csrf-token de chaque POST/PUT/PATCH/DELETE.
 */
export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/csrf")
      .then((res) => res.json())
      .then((data: { csrfToken: string }) => {
        if (!cancelled) setToken(data.csrfToken);
      })
      .catch(() => {
        /* le formulaire affichera l'erreur renvoyée par le POST si le jeton manque */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return token;
}
