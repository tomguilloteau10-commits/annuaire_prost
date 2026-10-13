import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";

export async function WhyUsSection() {
  const t = await getTranslations("whyUs");

  const pillars = [
    { title: t("verifiedTitle"), body: t("verifiedBody") },
    { title: t("discretionTitle"), body: t("discretionBody") },
    { title: t("directContactTitle"), body: t("directContactBody") },
  ];

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-center font-serif text-2xl font-medium text-ink2">{t("title")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="flex flex-col gap-2 p-5">
            <h3 className="font-serif text-lg font-medium text-ink2">{pillar.title}</h3>
            <p className="text-sm leading-relaxed text-ink2-muted">{pillar.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
