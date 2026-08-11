import { randomBytes } from "node:crypto";

const COMBINING_DIACRITICAL_MARKS = /[\u0300-\u036f]/g;

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "") // retire les accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug lisible + suffixe aleatoire court, pour eviter les collisions et l'enumeration. */
export function slugifyWithSuffix(value: string): string {
  const base = slugify(value) || "profil";
  return `${base}-${randomBytes(3).toString("hex")}`;
}
