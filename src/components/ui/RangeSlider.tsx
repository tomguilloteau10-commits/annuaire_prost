"use client";
import { useEffect, useState } from "react";

export interface RangeSliderProps {
  id: string;
  label: string;
  /** Bornes du curseur (toute l'échelle). */
  min: number;
  max: number;
  step?: number;
  /** Valeur appliquée (bornes absentes = pas de limite de ce côté). */
  value?: { min?: number; max?: number };
  /** Texte affiché pour une valeur (ex. "1,65 m", "B"). */
  format: (value: number) => string;
  /** Appelé au relâchement ; `undefined` quand toute l'échelle est sélectionnée. */
  onCommit: (range: { min?: number; max?: number } | undefined) => void;
}

/**
 * Curseur à deux poignées (minimum / maximum). Les deux poignées sont de
 * vrais <input type="range"> (clavier, lecteurs d'écran) superposés ; le
 * filtre ne s'applique qu'au relâchement, pas à chaque pixel.
 */
export function RangeSlider({ id, label, min, max, step = 1, value, format, onCommit }: RangeSliderProps) {
  const [low, setLow] = useState(value?.min ?? min);
  const [high, setHigh] = useState(value?.max ?? max);

  useEffect(() => {
    setLow(value?.min ?? min);
    setHigh(value?.max ?? max);
  }, [value?.min, value?.max, min, max]);

  function commit() {
    const range = { min: low > min ? low : undefined, max: high < max ? high : undefined };
    const unchanged = range.min === value?.min && range.max === value?.max;
    if (!unchanged) onCommit(range.min === undefined && range.max === undefined ? undefined : range);
  }

  const span = max - min || 1;
  const left = ((low - min) / span) * 100;
  const right = 100 - ((high - min) / span) * 100;
  const active = low > min || high < max;
  const commitProps = { onPointerUp: commit, onKeyUp: commit, onBlur: commit, onTouchEnd: commit };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={`${id}-label`} className="text-ink2-muted">
          {label}
        </span>
        <span className={active ? "font-medium text-ink2" : "text-ink2-faint"}>
          {low === high ? format(low) : `${format(low)} – ${format(high)}`}
        </span>
      </div>
      <div className="range-slider relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hairline2" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          type="range"
          aria-labelledby={`${id}-label`}
          aria-valuetext={format(low)}
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => setLow(Math.min(Number(e.target.value), high))}
          {...commitProps}
        />
        <input
          type="range"
          aria-labelledby={`${id}-label`}
          aria-valuetext={format(high)}
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => setHigh(Math.max(Number(e.target.value), low))}
          {...commitProps}
        />
      </div>
    </div>
  );
}
