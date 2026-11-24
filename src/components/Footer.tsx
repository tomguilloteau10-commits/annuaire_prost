import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FEATURES } from "@/lib/features";

const EXPLORE = [
  { href: "/categories/escort", key: "escorts" },
  { href: "/categories/masseuse", key: "masseuses" },
  { href: "/categories/dominatrice", key: "bdsm" },
  ...(FEATURES.salons ? [{ href: "/salons", key: "salons" }] : []),
  { href: "/stories", key: "stories" },
] as const;

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");
  const linkClass = "text-ink2-muted transition-colors hover:text-accent";

  return (
    <footer className="mt-12">
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-14 text-sm sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-4">
          <Link
            href="/"
            aria-label={common("siteName")}
            className="font-serif text-2xl leading-none tracking-tight"
          >
            <span className="font-medium text-ink2">Velvet</span>
            <span className="text-gold font-semibold italic">Girl</span>
          </Link>
          <p className="max-w-sm leading-relaxed text-ink2-muted">{t("tagline")}</p>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 px-3 py-1 text-xs text-accent">
            <span className="font-semibold">18+</span>
            {t("adultsOnly")}
          </span>
        </div>

        <nav aria-label={t("explore")} className="flex flex-col gap-2.5">
          <p className="eyebrow mb-1">{t("explore")}</p>
          {EXPLORE.map((item) => (
            <Link key={item.key} href={item.href} className={linkClass}>
              {nav(item.key)}
            </Link>
          ))}
        </nav>

        <nav aria-label={t("providers")} className="flex flex-col gap-2.5">
          <p className="eyebrow mb-1">{t("providers")}</p>
          <Link href="/register" className={linkClass}>
            {t("listYourProfile")}
          </Link>
          <Link href="/login" className={linkClass}>
            {nav("login")}
          </Link>
          <p className="pt-2 text-xs leading-relaxed text-ink2-faint">{t("noCommission")}</p>
        </nav>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink2-faint sm:flex-row sm:items-center sm:justify-between">
          <p>{t("disclaimer")}</p>
          <nav aria-label={t("legal")} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/legal/terms" className="transition-colors hover:text-ink2">
              {t("terms")}
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-ink2">
              {t("privacy")}
            </Link>
            <Link href="/legal/imprint" className="transition-colors hover:text-ink2">
              {t("imprint")}
            </Link>
            <span>
              © {new Date().getFullYear()} {common("siteName")}
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
