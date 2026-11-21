import type { ElementType, HTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Élément HTML à rendre (ex: "label" pour une carte cliquable englobant un input). */
  as?: ElementType;
}

export function Card({ as: Component = "div", className, ...props }: CardProps) {
  return (
    <Component
      className={cx(
        "rounded-xl2 border border-hairline bg-gradient-to-b from-surface-raised/70 to-surface/80 shadow-card backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
