import { defineRouting } from "next-intl/routing";

// FR et EN sont les langues réellement remplies pour la bêta ; DE/IT
// existent déjà dans le routing et les fichiers de messages pour que
// l'architecture multilingue soit posée dès le départ (contraintes du
// projet), mais leur contenu est un stub minimal — voir
// src/i18n/messages/{de,it}.json.
export const routing = defineRouting({
  locales: ["fr", "en", "de", "it"],
  defaultLocale: "fr",
});

export type AppLocale = (typeof routing.locales)[number];
