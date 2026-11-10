import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { withoutAdminMessages } from "@/i18n/admin-messages";
import "../globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const siteName = t("siteName");
  return {
    title: { default: siteName, template: `%s · ${siteName}` },
    description: t("tagline"),
    applicationName: siteName,
    openGraph: { siteName, title: siteName, description: t("tagline"), locale },
    // Bêta privée non référencée publiquement : on désindexe explicitement
    // tant que le flux de vérification et de modération n'a pas été validé.
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  // Les libellés de l'espace admin ne partent pas vers les pages publiques :
  // ils sont fournis par app/[locale]/admin/layout.tsx, seulement là.
  const messages = withoutAdminMessages(await getMessages());

  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col bg-ink font-sans text-ink2 antialiased">
        <NextIntlClientProvider messages={messages}>
          <Nav locale={locale} />
          <div className="flex-1">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
