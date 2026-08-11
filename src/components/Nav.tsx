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
    <header className="border-b border-gray-200">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          {common("siteName")}
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {!user && (
            <>
              <Link href="/login" className="hover:underline">
                {t("login")}
              </Link>
              <Link href="/register" className="hover:underline">
                {t("register")}
              </Link>
            </>
          )}

          {user?.role === "PROVIDER" && (
            <>
              <Link href="/provider/dashboard" className="hover:underline">
                {t("dashboard")}
              </Link>
              <LogoutButton />
            </>
          )}

          {(user?.role === "MODERATOR" || user?.role === "ADMIN") && (
            <>
              <Link href="/admin/moderation" className="hover:underline">
                {t("moderation")}
              </Link>
              {user.role === "ADMIN" && (
                <>
                  <Link href="/admin/taxonomies" className="hover:underline">
                    {t("taxonomies")}
                  </Link>
                  <Link href="/admin/audit-log" className="hover:underline">
                    {t("auditLog")}
                  </Link>
                  <Link href="/admin/geo-settings" className="hover:underline">
                    {t("geoSettings")}
                  </Link>
                </>
              )}
              <LogoutButton />
            </>
          )}

          <div className="flex gap-1 border-l border-gray-200 pl-4">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href="/"
                locale={loc}
                className={loc === locale ? "font-semibold underline" : "text-gray-400 hover:underline"}
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
