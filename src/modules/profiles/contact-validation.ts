/**
 * Règles de saisie du contact, partagées par le formulaire (messages
 * immédiats) et l'API (contrôle serveur). Module pur, sans accès base.
 */

/** Numéro de téléphone/WhatsApp : 9 à 15 chiffres (norme internationale), espaces et "+" tolérés. */
export function isValidPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 && /^[+\d\s().\-/]+$/.test(value.trim());
}

/** WhatsApp : un numéro, ou un lien wa.me contenant un numéro valide. */
export function isValidWhatsapp(value: string): boolean {
  const trimmed = value.trim();
  const link = trimmed.match(/^(?:https?:\/\/)?wa\.me\/(\+?\d+)/i);
  return link ? isValidPhoneNumber(link[1]!) : isValidPhoneNumber(trimmed);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
