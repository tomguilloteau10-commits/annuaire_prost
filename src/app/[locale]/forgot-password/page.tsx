import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card } from "@/components/ui/Card";
import { redirectIfSignedIn } from "@/lib/page-guards";

export default async function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await redirectIfSignedIn(locale);
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
          <h1 className="font-serif text-3xl font-normal text-ink2">{t("forgotTitle")}</h1>
        </div>
        <ForgotPasswordForm />
      </Card>
    </main>
  );
}
