import type { Metadata } from "next";
import { requirePageRole } from "@/lib/page-guards";

// Espace prestataire : garde de tout le segment /dashboard, côté serveur,
// en plus de la garde propre à chaque page (défense en profondeur).
// Visiteur → page de connexion ; admin → son propre espace (/admin).
// Voir tests/invariants/role-spaces.test.ts.
export const metadata: Metadata = { robots: { index: false, follow: false } };
// Garde exécutée à chaque requête : jamais de page pré-rendue ni mise en cache.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePageRole(locale, ["PROVIDER"]);
  return children;
}
