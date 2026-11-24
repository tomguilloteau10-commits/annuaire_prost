import { createRequire } from "node:module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const require = createRequire(import.meta.url);
// Règles maison (eslint-rules/) : interdit de journaliser des champs
// sensibles (téléphone, e-mail, adresse, date de naissance, documents).
const localRules = require("./eslint-local-rules.js");

export default defineConfig([
  ...nextVitals,
  {
    plugins: { "local-rules": { rules: localRules } },
    rules: {
      "local-rules/no-sensitive-log-fields": "error",
      // Journaux de l'application : uniquement via src/lib/logger.ts.
      "no-console": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "prisma/migrations/**",
    "storage/**",
    "public/vendor/**",
  ]),
]);
