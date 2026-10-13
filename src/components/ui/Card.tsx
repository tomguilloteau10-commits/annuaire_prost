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
        "rounded-xl2 border border-hairline bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}
