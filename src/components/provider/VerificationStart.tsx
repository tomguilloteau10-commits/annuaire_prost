"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

/**
 * Simule le parcours de vérification 18+ (MockVerificationProvider) : un
 * seul bouton enchaîne start puis callback. Un provider réel (Sumsub,
 * Veriff, ...) remplacerait ce composant par une redirection vers son
 * propre flux hébergé, suivi d'un retour sur cette page.
 */
export function VerificationStart() {
  const t = useTranslations("verification");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");

  async function handleStart() {
    if (!csrfToken) return;
    setStatus("running");

    const startResponse = await fetch("/api/verification/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    });
    if (!startResponse.ok) {
      setStatus("error");
      return;
    }
    const { verificationRecordId } = (await startResponse.json()) as { verificationRecordId: string };

    const callbackResponse = await fetch("/api/verification/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ verificationRecordId }),
    });
    if (!callbackResponse.ok) {
      setStatus("error");
      return;
    }

    router.push("/provider/dashboard");
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleStart}
        disabled={status === "running" || !csrfToken}
        className="rounded-md bg-brand px-4 py-2 text-base font-medium text-white disabled:opacity-50"
      >
        {status === "running" ? t("running") : t("start")}
      </button>
      {status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
    </div>
  );
}
