import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");

  return (
    <footer className="border-t border-hairline px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 text-center text-xs text-ink2-faint">
        <p className="font-serif text-sm text-ink2-muted">{common("siteName")}</p>
        <p>{t("disclaimer")}</p>
      </div>
    </footer>
  );
}
