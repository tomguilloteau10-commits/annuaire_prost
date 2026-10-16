import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { homeForRole } from "@/lib/spaces";

// Trois espaces cloisonnés côté serveur :
// - client (visiteur) : site public ;
// - prestataire : /dashboard, réservé au rôle PROVIDER ;
// - admin : /admin, réservé au rôle ADMIN (aucun autre rôle, pas même
//   MODERATOR).
// Test statique : chaque layout, page et handler d'API de ces espaces
// appelle une garde de rôle côté serveur avec exactement le bon rôle.

const ROOT = path.resolve(__dirname, "../../src/app");

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

const HANDLER = /export async function (GET|POST|PUT|PATCH|DELETE)\b/g;
const rel = (file: string) => path.relative(ROOT, file);

describe.each([
  { space: "admin", segment: "[locale]/admin", role: "ADMIN" },
  { space: "prestataire", segment: "[locale]/dashboard", role: "PROVIDER" },
])("espace $space : réservé au rôle $role", ({ segment, role }) => {
  it("le layout garde tout le segment", () => {
    const layout = path.join(ROOT, segment, "layout.tsx");
    expect(existsSync(layout)).toBe(true);
    expect(roleLists(readFileSync(layout, "utf8"), "requirePageRole")).toEqual([[role]]);
  });

  const pages = listFiles(path.join(ROOT, segment), "page.tsx");
  it.each(pages.map((p) => [rel(p), p]))("page %s", (_name, file) => {
    const lists = roleLists(readFileSync(file, "utf8"), "requirePageRole");
    expect(lists.length).toBeGreaterThan(0);
    for (const roles of lists) expect(roles).toEqual([role]);
  });
});

describe("API admin : réservée au rôle ADMIN", () => {
  const routes = listFiles(path.join(ROOT, "api/admin"), "route.ts");
  it.each(routes.map((p) => [rel(p), p]))("%s", (_name, file) => {
    const source = readFileSync(file, "utf8");
    const handlers = source.match(HANDLER) ?? [];
    const lists = roleLists(source, "requireRole");
    expect(handlers.length).toBeGreaterThan(0);
    expect(lists.length).toBe(handlers.length);
    for (const roles of lists) expect(roles).toEqual(["ADMIN"]);
  });
});

describe("API prestataire : réservée au rôle PROVIDER", () => {
  const routes = listFiles(path.join(ROOT, "api/provider"), "route.ts");
  it.each(routes.map((p) => [rel(p), p]))("%s", (_name, file) => {
    const source = readFileSync(file, "utf8");
    const handlers = source.match(HANDLER) ?? [];
    // Garde directe, ou helper local (requireProvider / requireOwnPhoto) qui
    // contient lui-même l'assertion de rôle PROVIDER.
    const guards =
      source.match(
        /requireRole\(\["PROVIDER"\]\)|requireProvider\(\)|requireOwnPhoto\(request|assertRole\(user\.role, \["PROVIDER"\]\)/g,
      ) ?? [];
    if (/requireOwnPhoto\(request/.test(source)) {
      expect(source).toMatch(/assertRole\(user\.role, \["PROVIDER"\]\)/);
    }
    expect(handlers.length).toBeGreaterThan(0);
    expect(guards.length).toBeGreaterThanOrEqual(handlers.length);
  });
});

describe("redirection vers son propre espace", () => {
  it("prestataire → /dashboard, admin → /admin, autres → accueil", () => {
    expect(homeForRole("PROVIDER")).toBe("/dashboard");
    expect(homeForRole("ADMIN")).toBe("/admin");
    expect(homeForRole("MODERATOR")).toBe("/");
    expect(homeForRole("CLIENT")).toBe("/");
  });
});
