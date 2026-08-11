import { z } from "zod";

// Taxonomies as data (voir docs/ARCHITECTURE.md) : le libellé multilingue
// est un Json { fr, en, de?, it? } — FR/EN obligatoires (langues remplies
// de la bêta), DE/IT optionnels (langues en structure, cf. i18n).
export const labelSchema = z.object({
  fr: z.string().min(1).max(120),
  en: z.string().min(1).max(120),
  de: z.string().min(1).max(120).optional(),
  it: z.string().min(1).max(120).optional(),
});

export type Label = z.infer<typeof labelSchema>;

export function getLocalizedLabel(label: unknown, locale: string): string {
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return "?";
  const value = parsed.data as Record<string, string | undefined>;
  return value[locale] ?? parsed.data.fr;
}
