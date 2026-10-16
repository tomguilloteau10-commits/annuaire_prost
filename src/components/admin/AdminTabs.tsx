"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/admin", key: "adminHome" },
  { href: "/admin/moderation", key: "moderation" },
  { href: "/admin/taxonomies", key: "taxonomies" },
  { href: "/admin/audit-log", key: "auditLog" },
  { href: "/admin/geo-settings", key: "geoSettings" },
] as const;

/** Onglets de l'espace admin (le menu principal n'affiche qu'un lien "Admin"). */
export function AdminTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("adminNavLabel")} className="scrollbar-none -mx-4 overflow-x-auto border-b border-hairline px-4">
      <ul className="mx-auto flex min-w-max max-w-5xl items-center gap-1 py-2">
        {TABS.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active ? "bg-accent text-accent-foreground" : "text-ink2-muted hover:text-ink2"
                }`}
              >
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
