"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";

export interface PhotoItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
}

export interface PhotoManagerProps {
  initialPhotos: PhotoItem[];
  maxPhotos: number;
}

const STATUS_BADGE_CLASS: Record<PhotoItem["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export function PhotoManager({ initialPhotos, maxPhotos }: PhotoManagerProps) {
  const t = useTranslations("profileEdit");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !csrfToken) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/provider/profile/photos", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: formData,
    });

    setUploading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(
        body?.error === "photo_limit_reached"
          ? t("photoLimitReached")
          : body?.error === "unsupported_content_type"
            ? t("photoUnsupportedType")
            : t("photoUploadError"),
      );
      return;
    }

    const { mediaId } = (await response.json()) as { mediaId: string };
    setPhotos((prev) => [...prev, { id: mediaId, status: "PENDING", rejectionReason: null }]);
    router.refresh();
  }

  async function handleDelete(mediaId: string) {
    if (!csrfToken) return;
    const response = await fetch(`/api/provider/profile/photos/${mediaId}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrfToken },
    });
    if (response.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      router.refresh();
    }
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <h2 className="text-base font-medium">{t("photosTitle")}</h2>
      <p className="text-xs text-gray-500">{t("photosHint")}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/provider/profile/photos/${photo.id}/preview`}
              alt=""
              className="aspect-square w-full rounded-md object-cover"
            />
            <span
              className={`self-start rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[photo.status]}`}
            >
              {t(`photoStatus.${photo.status}`)}
            </span>
            {photo.status === "REJECTED" && photo.rejectionReason && (
              <p className="text-xs text-red-600">{photo.rejectionReason}</p>
            )}
            <button
              type="button"
              onClick={() => handleDelete(photo.id)}
              className="text-xs text-gray-500 underline"
            >
              {t("photoDelete")}
            </button>
          </div>
        ))}
      </div>

      {photos.length < maxPhotos ? (
        <div className="flex flex-col gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading || !csrfToken}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t("photoLimitReached")}</p>
      )}
    </div>
  );
}
