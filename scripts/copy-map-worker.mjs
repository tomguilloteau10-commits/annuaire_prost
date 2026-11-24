// Copie le « worker » de la carte (MapLibre GL) dans public/vendor/ : depuis
// MapLibre 6, ce fichier est chargé à part par le navigateur et doit être
// servi par le site lui-même (même origine, autorisé par la CSP). Lancé
// automatiquement avant `next build` et `next dev` (scripts prebuild/predev).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
const targetDir = path.join(process.cwd(), "public", "vendor");
mkdirSync(targetDir, { recursive: true });
copyFileSync(source, path.join(targetDir, "maplibre-gl-worker.mjs"));
