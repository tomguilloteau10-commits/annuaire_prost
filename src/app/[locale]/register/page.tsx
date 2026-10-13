import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/Card";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16">
      <Card className="flex w-full max-w-sm flex-col items-center gap-6 p-8">
        <h1 className="font-serif text-2xl font-medium text-ink2">{t("registerTitle")}</h1>
        <RegisterForm />
      </Card>
    </main>
  );
}
