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
  /** Où compléter l'étape (chemin interne, sans locale). */
  href: string;
}

export type StatusTone = "online" | "pending" | "action";
export type StatusReason =
  | "published"
  | "pendingReview"
  | "verificationPending"
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
}

const EDIT_PATH = PROFILE_EDIT_PATH;

export function computeProviderDashboardState(input: ProviderDashboardInput): ProviderDashboardState {
  const hasProfile = input.profileStatus !== null;
  const verified = input.attestationCompleted && input.verificationStatus === "VERIFIED";
  // Photos et contact ne peuvent être ajoutés qu'une fois le profil créé :
  // sans profil, ces cases mènent à la première étape du formulaire.
  const stepHref = (step: string) => `${EDIT_PATH}?step=${hasProfile ? step : "identity"}`;

  const checklist: ChecklistItem[] = [
    {
      key: "ageVerification",
      done: verified,
      href: input.attestationCompleted ? VERIFICATION_PATH : ONBOARDING_PATH,
    },
    { key: "photo", done: input.photoCount > 0, href: stepHref("photos") },
    { key: "cityCategory", done: hasProfile, href: `${EDIT_PATH}?step=identity` },
    { key: "whatsapp", done: input.hasWhatsapp, href: stepHref("contact") },
  ];

  const missing = checklist.filter((item) => !item.done);
  const remainingCount = missing.length;
  const nextHref = missing[0]?.href ?? null;
  const canSubmit =
    remainingCount === 0 && (input.profileStatus === "DRAFT" || input.profileStatus === "REJECTED");

  const base = { checklist, remainingCount, nextHref, canSubmit };

  switch (input.profileStatus) {
    case "PUBLISHED":
      return { ...base, tone: "online", reason: "published" };
    case "PENDING_REVIEW":
      return { ...base, tone: "pending", reason: "pendingReview" };
    case "SUSPENDED":
      return { ...base, tone: "action", reason: "suspended" };
    case "REJECTED":
      return { ...base, tone: "action", reason: "rejected" };
  }

  // Brouillon ou pas encore de profil.
  const onlyVerificationRunning =
    missing.length === 1 &&
    missing[0]!.key === "ageVerification" &&
    (input.verificationStatus === "PENDING" || input.verificationStatus === "IN_PROGRESS");
  if (onlyVerificationRunning) return { ...base, tone: "pending", reason: "verificationPending" };
  if (canSubmit) return { ...base, tone: "action", reason: "readyToSubmit" };
  return { ...base, tone: "action", reason: "incomplete" };
}
