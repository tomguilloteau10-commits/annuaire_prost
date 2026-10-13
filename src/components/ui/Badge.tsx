import type { HTMLAttributes } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "accent" | "featured" | "successOnImage";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-white/[0.06] text-ink2-muted",
  accent: "bg-accent-soft text-accent",
  // Plein (pas "soft") : reste lisible posé sur une photo claire.
  featured: "bg-accent text-accent-foreground",
  // Fond noir à 60 % : le vert reste lisible quelle que soit la photo dessous.
  successOnImage: "bg-black/60 text-success backdrop-blur-sm",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Petit point plein avant le texte (ex: statut "en ligne"). */
  dot?: boolean;
}

export function Badge({ variant = "neutral", dot = false, className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
