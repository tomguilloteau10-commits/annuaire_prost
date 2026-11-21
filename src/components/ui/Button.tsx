import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-gold-sheen text-accent-foreground shadow-gold-btn hover:brightness-110",
  secondary: "border border-hairline2 bg-white/[0.03] text-ink2 hover:border-accent/40 hover:bg-white/[0.06]",
  ghost: "text-ink2-muted hover:text-ink2",
  danger: "bg-danger/90 text-[#2A1414] hover:bg-danger",
  success: "bg-success/90 text-[#102017] hover:bg-success",
};

export type ButtonSize = "md" | "lg";

// Taille via prop plutôt que via className : surcharger text-sm/px-4 par
// une classe ajoutée n'est pas fiable (l'ordre CSS de Tailwind décide).
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** "lg" : gros bouton, pour les parcours prestataire (cible au doigt). */
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
