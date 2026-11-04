/**
 * Logique (pure, sans accès base) du tableau de bord prestataire : la
 * checklist "Pour être visible" et LE message de statut dominant. Gardée
 * hors des composants pour être testée seule et rester la seule source de
 * vérité sur "que doit faire la prestataire maintenant ?".
 */

import { ONBOARDING_PATH, PROFILE_EDIT_PATH, VERIFICATION_PATH } from "@/lib/spaces";

export type ProfileStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
export type VerificationStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FAILED" | "EXPIRED";

export interface ProviderDashboardInput {
  profileStatus: ProfileStatus | null; // null : profil pas encore créé
  attestationCompleted: boolean;
  verificationStatus: VerificationStatus | null;
  /** Photos non refusées (en attente ou validées). */
  photoCount: number;
  hasWhatsapp: boolean;
}

export type ChecklistKey = "ageVerification" | "photo" | "cityCategory" | "whatsapp";

export interface ChecklistItem {
  key: ChecklistKey;
  done: boolean;
  /** Fait de son côté, en attente de l'admin (pièces d'identité déposées). */
  pending?: boolean;
  /** Où compléter l'étape (chemin interne, sans locale). */
  href: string;
}

export type StatusTone = "online" | "pending" | "action";
export type StatusReason =
  | "published"
  | "pendingReview"
  | "identityRejected"
  | "suspended"
  | "rejected"
  | "readyToSubmit"
  | "incomplete";

export interface ProviderDashboardState {
  tone: StatusTone;
  reason: StatusReason;
  checklist: ChecklistItem[];
  remainingCount: number;
  /** Prochaine étape à faire (première case non cochée), si elle existe. */
  nextHref: string | null;
  canSubmit: boolean;
  /** Âge (18+) validé par l'admin : badge "Profil vérifié", passage "En ligne" possible. */
  identityVerified: boolean;
}

const EDIT_PATH = PROFILE_EDIT_PATH;

export function computeProviderDashboardState(input: ProviderDashboardInput): ProviderDashboardState {
  const hasProfile = input.profileStatus !== null;
  const verified = input.attestationCompleted && input.verificationStatus === "VERIFIED";
  // Pièces déposées, décision de l'admin attendue : rien à faire côté prestataire.
  const identityUnderReview =
    input.attestationCompleted && (input.verificationStatus === "PENDING" || input.verificationStatus === "IN_PROGRESS");
  const identityRejected =
    input.attestationCompleted && (input.verificationStatus === "FAILED" || input.verificationStatus === "EXPIRED");
  // Photos et contact ne peuvent être ajoutés qu'une fois le profil créé :
  // sans profil, ces cases mènent à la première étape du formulaire.
  const stepHref = (step: string) => `${EDIT_PATH}?step=${hasProfile ? step : "presentation"}`;

  const checklist: ChecklistItem[] = [
    {
      key: "ageVerification",
      done: verified,
      pending: identityUnderReview,
      href: input.attestationCompleted ? VERIFICATION_PATH : ONBOARDING_PATH,
    },
    { key: "photo", done: input.photoCount > 0, href: stepHref("photos") },
    { key: "cityCategory", done: hasProfile, href: `${EDIT_PATH}?step=presentation` },
    { key: "whatsapp", done: input.hasWhatsapp, href: stepHref("contact") },
  ];

  // Ce qui reste à faire PAR LA PRESTATAIRE (une vérification en cours chez
  // l'admin n'en fait pas partie : elle peut déjà envoyer son profil).
  const missing = checklist.filter((item) => !item.done && !item.pending);
  const remainingCount = missing.length;
  const nextHref = missing[0]?.href ?? null;
  const canSubmit =
    remainingCount === 0 && (input.profileStatus === "DRAFT" || input.profileStatus === "REJECTED");

  const base = { checklist, remainingCount, nextHref, canSubmit, identityVerified: verified };

  switch (input.profileStatus) {
    case "PUBLISHED":
      return { ...base, tone: "online", reason: "published" };
    case "PENDING_REVIEW":
      if (identityRejected) return { ...base, tone: "action", reason: "identityRejected" };
      return { ...base, tone: "pending", reason: "pendingReview" };
    case "SUSPENDED":
      return { ...base, tone: "action", reason: "suspended" };
    case "REJECTED":
      return { ...base, tone: "action", reason: "rejected" };
  }

  // Brouillon ou pas encore de profil.
  if (identityRejected) return { ...base, tone: "action", reason: "identityRejected" };
  if (canSubmit) return { ...base, tone: "action", reason: "readyToSubmit" };
  return { ...base, tone: "action", reason: "incomplete" };
}
