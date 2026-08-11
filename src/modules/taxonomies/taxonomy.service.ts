import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { labelSchema, type Label } from "./types";

/**
 * Taxonomies as data : catégories, services, langues, villes sont éditées
 * depuis l'admin, jamais codées en dur. On désactive (`isActive: false`)
 * plutôt que de supprimer, pour ne jamais casser une référence existante
 * (profil publié, service choisi par une annonceuse) suite à une décision
 * d'admin — la donnée redevient simplement invisible pour les nouveaux
 * choix, sans jamais être perdue.
 */

// ── Category ────────────────────────────────────────────────────────────

export async function listCategories(options?: { includeInactive?: boolean }) {
  return prisma.category.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { key: "asc" },
  });
}

export async function createCategory(key: string, label: Label) {
  return prisma.category.create({ data: { key, label: labelSchema.parse(label) } });
}

export async function updateCategory(
  id: string,
  data: { label?: Label; isActive?: boolean },
) {
  return prisma.category.update({
    where: { id },
    data: { label: data.label ? labelSchema.parse(data.label) : undefined, isActive: data.isActive },
  });
}

// ── Service ─────────────────────────────────────────────────────────────

export async function listServices(options?: { includeInactive?: boolean; categoryId?: string }) {
  return prisma.service.findMany({
    where: {
      ...(options?.includeInactive ? {} : { isActive: true }),
      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    },
    orderBy: { key: "asc" },
  });
}

export async function createService(key: string, label: Label, categoryId?: string) {
  return prisma.service.create({ data: { key, label: labelSchema.parse(label), categoryId } });
}

export async function updateService(
  id: string,
  data: { label?: Label; isActive?: boolean; categoryId?: string | null },
) {
  return prisma.service.update({
    where: { id },
    data: {
      label: data.label ? labelSchema.parse(data.label) : undefined,
      isActive: data.isActive,
      categoryId: data.categoryId,
    },
  });
}

// ── Language ────────────────────────────────────────────────────────────

export async function listLanguages(options?: { includeInactive?: boolean }) {
  return prisma.language.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function createLanguage(code: string, label: Label) {
  return prisma.language.create({ data: { code, label: labelSchema.parse(label) } });
}

export async function updateLanguage(id: string, data: { label?: Label; isActive?: boolean }) {
  return prisma.language.update({
    where: { id },
    data: { label: data.label ? labelSchema.parse(data.label) : undefined, isActive: data.isActive },
  });
}

// ── City ────────────────────────────────────────────────────────────────
// Localisation approximative uniquement (contrainte #8) : nom de ville +
// canton, jamais d'adresse. lat/lng servent la recherche par
// ville/distance (PostGIS), pas la géolocalisation individuelle.

export interface CreateCityInput {
  name: string;
  canton: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export async function listCities(options?: { includeInactive?: boolean }) {
  return prisma.city.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createCity(input: CreateCityInput) {
  return prisma.city.create({
    data: {
      name: input.name,
      canton: input.canton,
      country: input.country ?? "CH",
      lat: input.lat,
      lng: input.lng,
      slug: slugify(`${input.name}-${input.canton}`),
    },
  });
}

export async function updateCity(
  id: string,
  data: Partial<CreateCityInput> & { isActive?: boolean },
) {
  return prisma.city.update({
    where: { id },
    data: {
      name: data.name,
      canton: data.canton,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
      isActive: data.isActive,
    },
  });
}
