import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Les écrans et API d'administration ne doivent jamais être accessibles au
// public ni aux prestataires. Test statique : chaque page sous
// app/[locale]/admin et chaque handler sous app/api/admin doit appeler une
// garde de rôle limitée au personnel. Seules la modération et les
// signalements sont ouverts aux modérateurs ; le reste est réservé à ADMIN.

const ROOT = path.resolve(__dirname, "../../src/app");
const STAFF = new Set(["MODERATOR", "ADMIN"]);

function listFiles(dir: string, fileName: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listFiles(full, fileName);
    return entry === fileName ? [full] : [];
  });
}

function roleLists(source: string, guard: string): string[][] {
  const pattern = new RegExp(`${guard}\\([^\\[]*\\[([^\\]]*)\\]`, "g");
  return [...source.matchAll(pattern)].map((m) =>
    m[1]!.split(",").map((r) => r.trim().replace(/["']/g, "")).filter(Boolean),
  );
}

function allowsModerators(file: string): boolean {
  return /[/\\](moderation|reports)[/\\]/.test(file);
}

describe("invariant: l'administration est réservée au personnel", () => {
  it("le segment /admin entier est gardé par son layout", () => {
    const layout = path.join(ROOT, "[locale]/admin/layout.tsx");
    expect(existsSync(layout)).toBe(true);
    const lists = roleLists(readFileSync(layout, "utf8"), "requirePageRole");
    expect(lists).toHaveLength(1);
    expect(lists[0]!.every((r) => STAFF.has(r))).toBe(true);
  });

  const pages = listFiles(path.join(ROOT, "[locale]/admin"), "page.tsx");
  it.each(pages.map((p) => [path.relative(ROOT, p), p]))("page %s", (_name, file) => {
    const lists = roleLists(readFileSync(file, "utf8"), "requirePageRole");
    expect(lists.length).toBeGreaterThan(0);
    for (const roles of lists) {
      expect(roles.length).toBeGreaterThan(0);
      expect(roles).toEqual(allowsModerators(file) ? ["MODERATOR", "ADMIN"] : ["ADMIN"]);
    }
  });

  const routes = listFiles(path.join(ROOT, "api/admin"), "route.ts");
  it.each(routes.map((p) => [path.relative(ROOT, p), p]))("API %s", (_name, file) => {
    const source = readFileSync(file, "utf8");
    const handlers = source.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) ?? [];
    const lists = roleLists(source, "requireRole");
    expect(handlers.length).toBeGreaterThan(0);
    expect(lists.length).toBe(handlers.length);
    for (const roles of lists) {
      expect(roles).toEqual(allowsModerators(file) ? ["MODERATOR", "ADMIN"] : ["ADMIN"]);
    }
  });
});
