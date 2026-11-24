import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const ICONS = {
  verified: (
    <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.4 7.5 9.5 4.4-1.1 7.5-5.1 7.5-9.5V6L12 3Zm-3.2 9 2.2 2.2 4.4-4.4" />
  ),
  discretion: <path d="M6.5 10.5V8a5.5 5.5 0 0 1 11 0v2.5M5 10.5h14v9.5H5v-9.5Zm7 3.5v2.5" />,
  directContact: <path d="M4.5 5.5h15v10h-9l-4.5 3.5v-3.5h-1.5v-10Zm4 4.5h7m-7 2.5h4.5" />,
};

export async function WhyUsSection() {
  const t = await getTranslations("whyUs");

  const pillars = [
    { key: "verified" as const, title: t("verifiedTitle"), body: t("verifiedBody") },
    { key: "discretion" as const, title: t("discretionTitle"), body: t("discretionBody") },
    { key: "directContact" as const, title: t("directContactTitle"), body: t("directContactBody") },
  ];

  return (
    <section className="flex flex-col gap-10">
      <Reveal>
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} align="center" />
      </Reveal>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pillars.map((pillar, index) => (
          <Reveal key={pillar.key} delay={index * 120} className="h-full">
            <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl2 border border-hairline bg-gradient-to-b from-surface-raised/60 to-surface/40 p-6 shadow-card transition-colors hover:border-accent/30">
              <span className="absolute right-5 top-4 font-serif text-4xl italic text-accent/10">
                0{index + 1}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-accent">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[pillar.key]}
                </svg>
              </span>
              <h3 className="font-serif text-xl font-normal text-ink2">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-ink2-muted">{pillar.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
