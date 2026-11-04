"use client";
import { useLocale, useTranslations } from "next-intl";

export const DOCUMENT_ACCEPT = "image/png,image/jpeg,application/pdf";
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** Taille lisible : "850 Ko", "2,4 Mo" (jamais "0.0 Mo" pour un petit fichier). */
function formatSize(bytes: number, locale: string): string {
  const [kb, mb] = locale === "fr" ? ["Ko", "Mo"] : ["KB", "MB"];
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ${kb}`;
  return `${(bytes / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 1 })} ${mb}`;
}

/** Contrôle immédiat (format, taille) avant tout envoi ; le serveur revérifie. */
export function checkDocument(file: File): "format" | "too_large" | null {
  if (!DOCUMENT_ACCEPT.split(",").includes(file.type)) return "format";
  if (file.size > DOCUMENT_MAX_BYTES) return "too_large";
  return null;
}

/**
 * Zone de dépôt d'une pièce (photo ou PDF), grande cible au doigt : ouvre
 * l'appareil photo ou la galerie sur téléphone. Affiche le fichier choisi
 * et un message clair si le format ou la taille ne conviennent pas.
 */
export function DocumentField({
  id,
  label,
  hint,
  optional = false,
  file,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const t = useTranslations("documents");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink2">
        {label}
        {optional && <span className="font-normal text-ink2-faint"> · {t("optional")}</span>}
      </span>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl2 border-2 border-dashed px-4 py-4 transition-colors ${
          error
            ? "border-danger/60 bg-danger-soft"
            : file
              ? "border-success/50 bg-success-soft"
              : "border-hairline2 bg-surface-raised hover:border-accent"
        }`}
      >
        <input
          id={id}
          type="file"
          accept={DOCUMENT_ACCEPT}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <span
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
            file ? "bg-success text-[#102017]" : "bg-accent text-accent-foreground"
          }`}
        >
          {file ? "✓" : "+"}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-ink2">{file ? file.name : t("choose")}</span>
          <span className="text-xs text-ink2-faint">
            {file ? t("selected", { size: formatSize(file.size, locale) }) : t("formats")}
          </span>
        </span>
      </label>
      {hint && !error && <p className="text-xs text-ink2-faint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
