import type { Metadata } from "next";
import { requirePageRole } from "@/lib/page-guards";
import { AdminTabs } from "@/components/admin/AdminTabs";

// Espace admin : garde de tout le segment /admin, côté serveur, en plus de
// la garde propre à chaque page (défense en profondeur). Seul le rôle ADMIN
// passe : visiteur → connexion, prestataire → son tableau de bord.
// Voir tests/invariants/role-spaces.test.ts.
export const metadata: Metadata = { robots: { index: false, follow: false } };
// Garde exécutée à chaque requête : jamais de page pré-rendue ni mise en cache.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requirePageRole(locale, ["ADMIN"]);
  return (
    <>
      <div className="px-4">
        <AdminTabs />
      </div>
      {children}
    </>
  );
}
