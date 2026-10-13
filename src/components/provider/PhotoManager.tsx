"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

export interface PhotoItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
}

export interface PhotoManagerProps {
  initialPhotos: PhotoItem[];
  maxPhotos: number;
}

const STATUS_BADGE_VARIANT: Record<PhotoItem["status"], BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
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
    <Card className="flex w-full max-w-2xl flex-col gap-3 p-5">
      <h2 className="font-serif text-lg font-medium text-ink2">{t("photosTitle")}</h2>
      <p className="text-xs text-ink2-faint">{t("photosHint")}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/provider/profile/photos/${photo.id}/preview`}
              alt=""
              className="aspect-square w-full rounded-xl object-cover"
            />
            <Badge variant={STATUS_BADGE_VARIANT[photo.status]} className="self-start">
              {t(`photoStatus.${photo.status}`)}
            </Badge>
            {photo.status === "REJECTED" && photo.rejectionReason && (
              <p className="text-xs text-danger">{photo.rejectionReason}</p>
            )}
            <button
              type="button"
              onClick={() => handleDelete(photo.id)}
              className="text-xs text-ink2-faint underline-offset-2 transition-colors hover:text-ink2-muted hover:underline"
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
            className="text-sm text-ink2-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-accent-foreground file:transition-colors hover:file:bg-accent-hover"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <p className="text-xs text-ink2-faint">{t("photoLimitReached")}</p>
      )}
    </Card>
  );
}
