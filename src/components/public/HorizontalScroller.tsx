"use client";
import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d={direction === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Rangée horizontale à défilement (doigt / trackpad sur mobile, flèches en
 * plus à partir de md). Les enfants portent eux-mêmes leur largeur et
 * `snap-start`.
 */
export function HorizontalScroller({ label, children }: { label: string; children: ReactNode }) {
  const t = useTranslations("common");
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  }

  const buttonClasses =
    "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-hairline2 bg-ink/80 text-ink2 shadow-pop backdrop-blur transition-colors hover:bg-surface-raised md:flex";

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {children}
      </div>
      <button type="button" onClick={() => scroll(-1)} aria-label={t("previous")} className={`${buttonClasses} left-2`}>
        <Chevron direction="left" />
      </button>
      <button type="button" onClick={() => scroll(1)} aria-label={t("next")} className={`${buttonClasses} right-2`}>
        <Chevron direction="right" />
      </button>
    </div>
  );
}
