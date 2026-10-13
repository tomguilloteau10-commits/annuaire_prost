import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary: "border border-hairline2 bg-surface-raised text-ink2 hover:bg-surface-hover",
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
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
