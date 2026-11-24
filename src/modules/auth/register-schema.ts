import { z } from "zod";

/**
 * Données attendues à l'inscription. Les deux cases (conditions +
 * confidentialité, consentement exprès pour les données sensibles) sont
 * OBLIGATOIRES côté serveur : un appel direct à l'API sans elles est refusé,
 * quel que soit le formulaire.
 */
export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(256),
  acceptTerms: z.literal(true),
  consentSensitiveData: z.literal(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
