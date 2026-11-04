/**
 * Adresses de connexion des comptes FICTIFS créés par prisma/seed.ts pour
 * remplir l'annuaire de démonstration. C'est la seule liste qui fait foi
 * pour les reconnaître : on ne se fie jamais à un prénom ou à un nom
 * d'affichage (une vraie prestataire peut s'appeler « Léa » elle aussi).
 *
 * Le compte admin de démo (admin@example.test) n'en fait PAS partie : il
 * sert à administrer le site et n'est jamais supprimé.
 */
export const DEMO_PROVIDER_EMAILS = [
  "prestataire@example.test", // profil fictif « Léa »
  "lea.demo@example.test", // ancienne adresse du même profil fictif
  "ines.demo@example.test",
  "jade.demo@example.test",
  "emma.demo@example.test",
  "nora.demo@example.test",
  "manon.demo@example.test",
  "sofia.demo@example.test",
  "alice.demo@example.test",
  "chloe.demo@example.test",
  "leonie.demo@example.test",
  "lina.demo@example.test",
  "camille.demo@example.test",
  "clara.demo@example.test",
  "elena.demo@example.test",
  "maya.demo@example.test",
  "sarah.demo@example.test",
  "zoe.demo@example.test",
  "nina.demo@example.test",
  "moderator@example.test", // ancien compte de démo, sans espace
] as const;

const DEMO_SET = new Set<string>(DEMO_PROVIDER_EMAILS);

export function isDemoProviderEmail(email: string): boolean {
  return DEMO_SET.has(email.trim().toLowerCase());
}
