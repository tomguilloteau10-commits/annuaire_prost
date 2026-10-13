import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/modules/auth/session";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LogoutButton } from "@/components/LogoutButton";

export async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations("nav");
  const common = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight text-ink2">
          {common("siteName")}
        </Link>

        <div className="flex flex-wrap items-center gap-5 text-sm text-ink2-muted">
          {!user && (
            <>
              <Link href="/login" className="transition-colors hover:text-ink2">
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-accent px-4 py-1.5 font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                {t("register")}
              </Link>
            </>
          )}

          {user?.role === "PROVIDER" && (
            <>
              <Link href="/provider/dashboard" className="transition-colors hover:text-ink2">
                {t("dashboard")}
              </Link>
              <LogoutButton />
            </>
          )}

          {(user?.role === "MODERATOR" || user?.role === "ADMIN") && (
            <>
              <Link href="/admin/moderation" className="transition-colors hover:text-ink2">
                {t("moderation")}
              </Link>
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin/taxonomies" className="transition-colors hover:text-ink2">
                    {t("taxonomies")}
                  </Link>
                  <Link href="/admin/audit-log" className="transition-colors hover:text-ink2">
                    {t("auditLog")}
                  </Link>
                  <Link href="/admin/geo-settings" className="transition-colors hover:text-ink2">
                    {t("geoSettings")}
                  </Link>
                </>
              )}
              <LogoutButton />
            </>
          )}

          <div className="flex gap-2.5 border-l border-hairline pl-4">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href="/"
                locale={loc}
                className={
                  loc === locale
                    ? "font-semibold text-ink2"
                    : "text-ink2-faint transition-colors hover:text-ink2-muted"
                }
              >
                {loc.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
