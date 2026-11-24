import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LEGAL_DRAFT, LEGAL_VERSION } from "@/content/legal/operator";
import { TermsFr } from "@/content/legal/TermsFr";
import { PrivacyFr } from "@/content/legal/PrivacyFr";
import { ImprintFr } from "@/content/legal/ImprintFr";

// Pages légales : seule la version française existe pour l'instant (elle
// fait foi) ; les autres langues l'affichent avec un avertissement traduit.
const DOCS = { terms: TermsFr, privacy: PrivacyFr, imprint: ImprintFr } as const;
type DocKey = keyof typeof DOCS;

function isDoc(value: string): value is DocKey {
  return value in DOCS;
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => Object.keys(DOCS).map((doc) => ({ locale, doc })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isDoc(doc)) return {};
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t(`titles.${doc}`) };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  if (!isDoc(doc)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const Doc = DOCS[doc];
  const version = new Intl.DateTimeFormat(locale === "fr" ? "fr-CH" : `${locale}-CH`, {
    dateStyle: "long",
  }).format(new Date(LEGAL_VERSION));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-serif text-3xl font-medium text-ink2 sm:text-4xl">{t(`titles.${doc}`)}</h1>
        <p className="text-xs text-ink2-faint">{t("version", { date: version })}</p>
      </header>

      {LEGAL_DRAFT && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {t("draftNotice")}
        </p>
      )}
      {locale !== "fr" && (
        <p
          lang={locale}
          className="rounded-xl border border-hairline bg-surface-raised/50 px-4 py-3 text-sm text-ink2-muted"
        >
          {t("frenchOnly")}
        </p>
      )}

      <div lang="fr" className="flex flex-col gap-8">
        <Doc />
      </div>
    </main>
  );
}
