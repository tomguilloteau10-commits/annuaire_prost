import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/modules/auth/session";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";
import { ADMIN_PATH, DASHBOARD_PATH } from "@/lib/spaces";

export async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations("nav");
  const common = await getTranslations("common");
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-ink/85 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
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

            {/* Menu selon le rôle : visiteur → connexion/inscription,
                prestataire → son tableau de bord, admin → l'espace admin.
                Aucun lien vers un autre espace (les pages restent de toute
                façon gardées côté serveur). */}
            {user?.role === "PROVIDER" && (
              <Link href={DASHBOARD_PATH} className="transition-colors hover:text-ink2">
                {t("dashboard")}
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href={ADMIN_PATH}
                className="rounded-full border border-hairline2 px-3.5 py-1 font-medium text-ink2 transition-colors hover:bg-surface-raised"
              >
                {t("admin")}
              </Link>
            )}
            {user && <LogoutButton />}

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
        </div>

        <div className="pb-2.5">
          <NavLinks />
        </div>
      </div>
    </header>
  );
}
