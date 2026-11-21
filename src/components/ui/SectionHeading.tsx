import type { ReactNode } from "react";

/**
 * En-tête de section : petit intitulé doré en capitales, grand titre
 * serif, action facultative à droite (« Voir tout »). Donne le même rythme
 * à toutes les sections du site.
 */
export function SectionHeading({
  eyebrow,
  title,
  action,
  align = "left",
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
}) {
  const centered = align === "center";
  return (
    <div className={`flex gap-4 ${centered ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div className={`flex flex-col gap-2 ${centered ? "items-center" : ""}`}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading className="font-serif text-[1.75rem] font-normal leading-tight tracking-tight text-ink2 sm:text-[2rem]">
          {title}
        </Heading>
      </div>
      {action && <div className="shrink-0 pb-1 text-sm">{action}</div>}
    </div>
  );
}
