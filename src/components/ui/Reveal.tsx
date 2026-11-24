"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Apparition douce (fondu + léger glissement vers le haut) quand l'élément
 * arrive à l'écran en faisant défiler la page.
 *
 * Garde-fous :
 * - rien n'est jamais masqué dans le HTML envoyé par le serveur : sans
 *   JavaScript, ou si le script tarde, tout reste visible ;
 * - un élément déjà visible au chargement ne s'anime pas (pas de
 *   clignotement en haut de page) — seuls ceux plus bas sont masqués puis
 *   révélés ;
 * - préférence système « réduire les animations » : aucune animation.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Décalage en millisecondes (effet « en cascade » dans une grille). */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Déjà (presque) à l'écran au chargement : affiché tel quel.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      style={delay && state !== "static" ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
