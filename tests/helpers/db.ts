import { PrismaClient } from "@prisma/client";

/**
 * Les tests d'invariants dans ce dossier sont des tests d'intégration :
 * ils ont besoin d'une vraie base Postgres+PostGIS migrée (voir README.md
 * "Tests"). Ils créent leurs propres fixtures minimales (idempotentes,
 * upsert) plutôt que de dépendre de prisma/seed.ts, pour rester
 * exécutables sur une base fraîchement migrée mais non seedée.
 */
export const prisma = new PrismaClient();

export interface BaseFixtures {
  planId: string;
  cityId: string;
  categoryId: string;
}

/**
 * Crée un jeu de fixtures propre à l'appelant (code/slug/key uniques),
 * plutôt que de partager une ligne "test-plan"/"test-city"/"test-category"
 * entre fichiers de test. Vitest exécute les fichiers de test en
 * parallèle par défaut : un upsert partagé sur la même clé unique depuis
 * plusieurs fichiers peut se heurter à une contrainte d'unicité (Prisma ne
 * garantit pas l'atomicité de `upsert()` face à une vraie concurrence).
 * Des fixtures indépendantes par appel éliminent le problème et isolent
 * mieux les tests entre eux.
 */
export async function ensureBaseFixtures(): Promise<BaseFixtures> {
  const suffix = uniqueSlug("fixture");

  const plan = await prisma.plan.create({
    data: {
      code: `test-plan-${suffix}`,
      name: "Test Plan",
      features: { maxPhotos: 6, boost: false, prioritySupport: false },
    },
  });

  const city = await prisma.city.create({
    data: { name: "Test City", canton: "GE", country: "CH", slug: `test-city-${suffix}` },
  });

  const category = await prisma.category.create({
    data: { key: `test-category-${suffix}`, label: { fr: "Test", en: "Test" } },
  });

  return { planId: plan.id, cityId: city.id, categoryId: category.id };
}

let counter = 0;

export function uniqueSlug(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}
