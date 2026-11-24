/**
 * Rubriques activables. Une rubrique désactivée disparaît du menu, du pied
 * de page et des formulaires, et son adresse répond « page introuvable ».
 *
 * - salons : les établissements affichés sont pour l'instant FICTIFS (voir
 *   modules/showcase/demo-salons.ts). À réactiver seulement quand de vrais
 *   salons existeront, vérifiés et modérés comme les profils.
 * - camLive : aucun service de diffusion n'existe ; la page n'est qu'une
 *   annonce « bientôt ».
 */
export const FEATURES = {
  salons: false,
  camLive: false,
} as const;
