import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Matérialise ENGINEERING_RULES.md §1 (rétention zéro) : ce test échoue si
// un champ interdit apparaît dans le schéma Prisma, qu'il ait été ajouté
// par erreur, par une future PR, ou par un contributeur qui n'a pas lu les
// règles. L'invariant est donc auto-vérifié, pas seulement documenté.
//
// Les lignes de commentaire (// ...) sont ignorées : ENGINEERING_RULES.md
// et le schéma lui-même mentionnent volontairement ces noms de champs dans
// des commentaires explicatifs ("n'ajoutez jamais dateOfBirth ici") — ce
// n'est pas ce que ce test doit attraper.

const FORBIDDEN_FIELD_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /date.?of.?birth/i, label: "dateOfBirth" },
  { pattern: /birth.?date/i, label: "birthDate" },
  { pattern: /^dob$/i, label: "dob" },
  { pattern: /document.?number/i, label: "documentNumber" },
  { pattern: /document.?image/i, label: "documentImage" },
  { pattern: /selfie.?image/i, label: "selfieImage" },
  { pattern: /biometric.?data/i, label: "biometricData" },
];

const RESERVED_LEADING_TOKENS = new Set([
  "model",
  "enum",
  "generator",
  "datasource",
  "//",
]);

function extractFieldDeclarations(schema: string): { line: number; token: string }[] {
  const declarations: { line: number; token: string }[] = [];

  schema.split("\n").forEach((rawLine, index) => {
    const withoutInlineComment = rawLine.split("//")[0] ?? "";
    const trimmed = withoutInlineComment.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("@@") || trimmed.startsWith("}") || trimmed.startsWith("{")) return;

    const firstToken = trimmed.split(/\s+/)[0];
    if (!firstToken) return;
    if (RESERVED_LEADING_TOKENS.has(firstToken.toLowerCase())) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(firstToken)) return;

    declarations.push({ line: index + 1, token: firstToken });
  });

  return declarations;
}

describe("prisma/schema.prisma — rétention zéro (invariant auto-vérifié)", () => {
  const schemaPath = path.resolve(__dirname, "../../prisma/schema.prisma");
  const schema = readFileSync(schemaPath, "utf-8");

  it("ne déclare aucun champ interdit (document brut, biométrie, date de naissance)", () => {
    const declarations = extractFieldDeclarations(schema);
    const violations = declarations.flatMap(({ line, token }) =>
      FORBIDDEN_FIELD_PATTERNS.filter(({ pattern }) => pattern.test(token)).map(
        ({ label }) => `ligne ${line}: champ "${token}" ressemble au motif interdit "${label}"`,
      ),
    );

    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("sanity check: le test lit bien un schéma non vide avec des modèles", () => {
    expect(schema.length).toBeGreaterThan(100);
    expect(schema).toMatch(/model VerificationRecord/);
  });
});
