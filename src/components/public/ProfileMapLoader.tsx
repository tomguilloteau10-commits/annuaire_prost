"use client";
import dynamic from "next/dynamic";

// `dynamic(..., { ssr: false })` n'est autorisé que depuis un module
// "use client" (Next.js App Router) — ce petit fichier existe uniquement
// pour porter cette règle, afin que la page d'accueil (Server Component)
// puisse importer la carte normalement sans jamais déclencher son rendu
// côté serveur (MapLibre a besoin d'un vrai canvas WebGL, absent en SSR).
export const ProfileMapLoader = dynamic(() => import("./ProfileMap").then((m) => m.ProfileMap), {
  ssr: false,
});
