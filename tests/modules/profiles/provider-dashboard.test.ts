import { describe, expect, it } from "vitest";
import {
  computeProviderDashboardState,
  type ProviderDashboardInput,
} from "@/modules/profiles/provider-dashboard";

const complete: ProviderDashboardInput = {
  profileStatus: "DRAFT",
  attestationCompleted: true,
  verificationStatus: "VERIFIED",
  photoCount: 1,
  hasWhatsapp: true,
};

describe("computeProviderDashboardState", () => {
  it("nouveau compte : tout est à faire, première étape = attestation", () => {
    const state = computeProviderDashboardState({
      profileStatus: null,
      attestationCompleted: false,
      verificationStatus: null,
      photoCount: 0,
      hasWhatsapp: false,
    });
    expect(state.tone).toBe("action");
    expect(state.reason).toBe("incomplete");
    expect(state.remainingCount).toBe(4);
    expect(state.nextHref).toBe("/dashboard/onboarding");
    // sans profil, photos et contact renvoient à la création du profil
    expect(state.checklist.find((i) => i.key === "photo")?.href).toBe("/dashboard/profile?step=presentation");
    expect(state.canSubmit).toBe(false);
  });

  it("brouillon complet : prêt à être envoyé", () => {
    const state = computeProviderDashboardState(complete);
    expect(state.reason).toBe("readyToSubmit");
    expect(state.canSubmit).toBe(true);
    expect(state.remainingCount).toBe(0);
  });

  it("une case manquante mène directement à la bonne étape", () => {
    const state = computeProviderDashboardState({ ...complete, hasWhatsapp: false });
    expect(state.reason).toBe("incomplete");
    expect(state.nextHref).toBe("/dashboard/profile?step=contact");
    expect(state.canSubmit).toBe(false);
  });

  it("documents en attente de l'admin : profil envoyable, mais identité pas encore vérifiée", () => {
    const state = computeProviderDashboardState({ ...complete, verificationStatus: "PENDING" });
    const age = state.checklist.find((i) => i.key === "ageVerification");
    expect(age).toMatchObject({ done: false, pending: true });
    // rien à faire côté prestataire pour la vérification : elle peut envoyer son profil
    expect(state.remainingCount).toBe(0);
    expect(state.canSubmit).toBe(true);
    expect(state.reason).toBe("readyToSubmit");
    expect(state.identityVerified).toBe(false);
  });

  it("validation par l'admin : profil vérifié", () => {
    const state = computeProviderDashboardState({ ...complete, profileStatus: "PENDING_REVIEW" });
    expect(state.identityVerified).toBe(true);
    expect(state.checklist.find((i) => i.key === "ageVerification")?.done).toBe(true);
  });

  it("documents refusés par l'admin : action requise, renvoi vers « Ma vérification »", () => {
    const state = computeProviderDashboardState({ ...complete, profileStatus: "PENDING_REVIEW", verificationStatus: "FAILED" });
    expect(state.tone).toBe("action");
    expect(state.reason).toBe("identityRejected");
    expect(state.identityVerified).toBe(false);
    expect(state.checklist.find((i) => i.key === "ageVerification")?.href).toBe("/dashboard/verification");
  });

  it("statuts de modération", () => {
    expect(computeProviderDashboardState({ ...complete, profileStatus: "PUBLISHED" }).tone).toBe("online");
    expect(computeProviderDashboardState({ ...complete, profileStatus: "PENDING_REVIEW" }).reason).toBe(
      "pendingReview",
    );
    const rejected = computeProviderDashboardState({ ...complete, profileStatus: "REJECTED" });
    expect(rejected.reason).toBe("rejected");
    expect(rejected.canSubmit).toBe(true);
    expect(computeProviderDashboardState({ ...complete, profileStatus: "SUSPENDED" }).tone).toBe("action");
  });
});
