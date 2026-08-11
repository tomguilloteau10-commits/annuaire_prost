import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip-hash";
import { computePurgeAt, DATA_CATEGORIES } from "@/modules/retention/retention-policy.service";

export interface RevealedContact {
  phone: string | null;
  email: string | null;
}

/**
 * Seule fonction de tout le code applicatif qui lit `ProfileContact` pour
 * un usage visiteur (ENGINEERING_RULES.md §5). Appelée uniquement par
 * /api/profiles/[slug]/contact, à la demande, jamais au chargement d'une
 * page. Journalise chaque révélation (anti-abus, purge via
 * DataRetentionPolicy) sans jamais stocker l'IP en clair.
 */
export async function revealContact(
  slug: string,
  requesterIp: string | null,
): Promise<RevealedContact | null> {
  const profile = await prisma.providerProfile.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!profile) return null;

  const contact = await prisma.profileContact.findUnique({ where: { profileId: profile.id } });
  if (!contact) return null;

  await prisma.contactRevealLog.create({
    data: {
      profileId: profile.id,
      requesterIpHash: requesterIp ? hashIp(requesterIp) : "unknown",
      purgeAt: await computePurgeAt(DATA_CATEGORIES.CONTACT_REVEAL_LOG),
    },
  });

  return { phone: contact.phone, email: contact.email };
}
