"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export function LogoutButton() {
  const t = useTranslations("nav");
  const router = useRouter();
  const csrfToken = useCsrfToken();

  async function handleLogout() {
    if (!csrfToken) return;
    await fetch("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": csrfToken } });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="text-sm text-gray-600 hover:underline">
      {t("logout")}
    </button>
  );
}
