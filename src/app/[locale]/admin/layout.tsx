import type { Metadata } from "next";
import { requirePageRole } from "@/lib/page-guards";

// Garde de tout le segment /admin, en plus de la garde propre à chaque page
// (défense en profondeur) : une future page admin oubliant sa garde reste
// inaccessible aux visiteurs et aux prestataires. Les pages réservées à
// l'admin (catégories, historique, pays) restreignent encore à ADMIN.
// Voir tests/invariants/admin-routes-staff-only.test.ts.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePageRole(locale, ["MODERATOR", "ADMIN"]);
  return children;
}
