import { useTranslations } from "next-intl";
import type { DemoSalon } from "@/modules/showcase/demo-salons";

export function SalonCard({ salon }: { salon: DemoSalon }) {
  const t = useTranslations("salons");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl3 border border-hairline bg-surface shadow-card">
      <div
        className="relative flex aspect-[4/3] items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${salon.gradient[0]}, ${salon.gradient[1]})` }}
      >
        <span className="font-serif text-6xl text-white/20" aria-hidden>
          {salon.monogram}
        </span>
        {/* Fond sombre translucide : reste lisible sur les couvertures claires. */}
        <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-ink2 backdrop-blur">
          {t(`types.${salon.type}`)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-4">
        <h2 className="font-serif text-lg font-medium text-ink2">{salon.name}</h2>
        <p className="text-sm text-ink2-muted">
          {salon.city} ({salon.canton})
        </p>
      </div>
    </article>
  );
}
