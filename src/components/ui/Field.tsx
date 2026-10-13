import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const FIELD_BASE_CLASSES =
  "rounded-xl border border-hairline2 bg-surface-raised px-3.5 py-2.5 text-sm text-ink2 placeholder:text-ink2-faint transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50";
const FIELD_CLASSES = `w-full ${FIELD_BASE_CLASSES}`;

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-ink2-muted ${className}`} {...props} />;
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASSES} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASSES} resize-y ${className}`} {...props} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Pleine largeur sur mobile, largeur ajustée au contenu à partir de md. */
  fit?: boolean;
}

// La largeur passe par `fit` plutôt que par `className` : un `w-auto` ajouté
// à côté du `w-full` de base perd dans l'ordre de la feuille Tailwind, alors
// qu'une variante responsive (md:w-auto) gagne toujours.
export function Select({ className = "", fit = false, ...props }: SelectProps) {
  const width = fit ? "w-full md:w-auto" : "w-full";
  return <select className={`${width} ${FIELD_BASE_CLASSES} ${className}`} {...props} />;
}

export function FieldGroup({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col gap-1.5 ${className}`} {...props} />;
}
