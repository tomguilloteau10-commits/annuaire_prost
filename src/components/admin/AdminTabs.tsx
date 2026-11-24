"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/admin", key: "adminHome" },
  { href: "/admin/identities", key: "adminIdentities" },
  { href: "/admin/permits", key: "adminPermits" },
  { href: "/admin/profiles", key: "adminProfiles" },
  { href: "/admin/moderation", key: "moderation" },
  { href: "/admin/reports", key: "adminReports" },
  { href: "/admin/subscriptions", key: "adminSubscriptions" },
  { href: "/admin/taxonomies", key: "taxonomies" },
  { href: "/admin/audit-log", key: "auditLog" },
  { href: "/admin/geo-settings", key: "geoSettings" },
] as const;

const OUTBOX_TAB = { href: "/admin/outbox", key: "adminOutbox" } as const;

/** Onglets de l'espace admin (le menu principal n'affiche qu'un lien "Admin"). */
export function AdminTabs({ showOutbox = false }: { showOutbox?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("adminNavLabel")}
      className="scrollbar-none -mx-4 overflow-x-auto border-b border-hairline px-4"
    >
      <ul className="mx-auto flex min-w-max max-w-5xl items-center gap-1 py-2">
        {[...TABS, ...(showOutbox ? [OUTBOX_TAB] : [])].map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent-soft text-accent ring-1 ring-inset ring-accent/30"
                    : "text-ink2-muted hover:text-ink2"
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
