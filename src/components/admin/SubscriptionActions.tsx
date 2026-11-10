"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
import { Button } from "@/components/ui/Button";

/**
 * « Marquer comme payé » (paiement reçu hors plateforme) et « Mettre en
 * pause ». Une confirmation évite un clic malheureux : les deux changent
 * la visibilité publique du profil.
 */
export function SubscriptionActions({
  profileId,
  name,
  paused,
}: {
  profileId: string;
  name: string;
  paused: boolean;
}) {
  const t = useTranslations("adminSubscriptions");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "mark-paid" | "pause") {
    if (!csrfToken) return;
    if (!window.confirm(action === "mark-paid" ? t("confirmPaid", { name }) : t("confirmPause", { name }))) return;
    setBusy(true);
    setError(null);
    const result = await sendRequest(`/api/admin/subscriptions/${profileId}/${action}`, { method: "POST", csrfToken });
    setBusy(false);
    if (!result.ok) {
      setError(result.status === 0 ? t("networkError") : t("actionError"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={() => run("mark-paid")} disabled={busy || !csrfToken}>
          {t("markPaid")}
        </Button>
        {!paused && (
          <Button variant="secondary" onClick={() => run("pause")} disabled={busy || !csrfToken}>
            {t("pause")}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
