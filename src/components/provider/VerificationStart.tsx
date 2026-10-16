"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Button } from "@/components/ui/Button";
import { DASHBOARD_PATH } from "@/lib/spaces";

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

    router.push(DASHBOARD_PATH);
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <Button onClick={handleStart} disabled={status === "running" || !csrfToken}>
        {status === "running" ? t("running") : t("start")}
      </Button>
      {status === "error" && <p className="text-sm text-danger">{t("error")}</p>}
    </div>
  );
}
