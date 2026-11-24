import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/Card";

// Le lien contient un jeton secret (après « # ») : la page n'est jamais
// indexée et ne transmet pas son adresse aux autres sites.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16">
      <Card className="relative flex w-full max-w-sm flex-col items-center gap-6 overflow-hidden p-8 shadow-pop">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <p className="eyebrow">{t("authEyebrowLogin")}</p>
          <h1 className="font-serif text-3xl font-normal text-ink2">{t("resetTitle")}</h1>
        </div>
        <ResetPasswordForm />
      </Card>
    </main>
  );
}
