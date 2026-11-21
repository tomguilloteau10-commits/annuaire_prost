"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/categories/escort", key: "escorts" },
  { href: "/categories/masseuse", key: "masseuses" },
  { href: "/categories/dominatrice", key: "bdsm" },
  { href: "/categories/striptease", key: "striptease" },
  { href: "/salons", key: "salons" },
  { href: "/stories", key: "stories" },
  { href: "/cam-live", key: "camLive", soon: true },
] as const;

export function NavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("mainNavLabel")} className="scrollbar-none -mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-1.5 px-3 pb-3 pt-2 text-sm tracking-[0.01em] transition-colors ${
                  active ? "text-ink2" : "text-ink2-muted hover:text-ink2"
                }`}
              >
                {t(item.key)}
                {/* Page courante : fin trait doré sous l'intitulé. */}
                <span
                  aria-hidden
                  className={`absolute inset-x-3 bottom-0 h-px rounded-full bg-gold-sheen transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                {"soon" in item && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label={t("soon")} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
