import { notFound } from "next/navigation";

// Toute adresse inconnue sous /fr, /en, /de, /it : notre page 404
// (app/[locale]/not-found.tsx, traduite et au style du site) plutôt que
// la page blanche par défaut de Next.js.
export default function CatchAllPage() {
  notFound();
}
