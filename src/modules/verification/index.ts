import { getEnv } from "@/lib/env";
import { MockVerificationProvider } from "./mock-provider";
import type { VerificationProvider } from "./types";

/**
 * Point de branchement unique pour substituer un vrai provider
 * (Sumsub, Veriff, PXL Vision, e-ID suisse) : ajoutez un `case` ici et une
 * implémentation dans ce dossier respectant `VerificationProvider`. Aucun
 * appelant de ce module ne doit jamais importer `MockVerificationProvider`
 * directement.
 */
export function getVerificationProvider(): VerificationProvider {
  const { VERIFICATION_PROVIDER } = getEnv();
  switch (VERIFICATION_PROVIDER) {
    case "mock":
      return new MockVerificationProvider();
    default:
      throw new Error(`VerificationProvider inconnu: ${VERIFICATION_PROVIDER satisfies never}`);
  }
}

export type { VerificationProvider, VerificationResult, StartVerificationInput, StartVerificationOutput } from "./types";
