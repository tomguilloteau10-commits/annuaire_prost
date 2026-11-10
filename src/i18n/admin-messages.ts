import type { AbstractIntlMessages } from "next-intl";

/** Espaces de traduction propres à l'espace admin (jamais envoyés aux autres pages). */
export const ADMIN_NAMESPACES = ["moderation", "adminTaxonomies", "adminAuditLog", "adminGeoSettings", "adminHome", "adminSubscriptions"];

export function withoutAdminMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return Object.fromEntries(Object.entries(messages).filter(([namespace]) => !ADMIN_NAMESPACES.includes(namespace)));
}
