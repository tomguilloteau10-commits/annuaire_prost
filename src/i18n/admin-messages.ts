import type { AbstractIntlMessages } from "next-intl";

/** Espaces de traduction propres à l'espace admin (jamais envoyés aux autres pages). */
export const ADMIN_NAMESPACES = ["moderation", "adminTaxonomies", "adminAuditLog", "adminGeoSettings", "adminHome"];

export function withoutAdminMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return Object.fromEntries(Object.entries(messages).filter(([namespace]) => !ADMIN_NAMESPACES.includes(namespace)));
}
