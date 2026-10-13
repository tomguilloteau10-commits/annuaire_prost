"use client";
import { useState } from "react";
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

/**
 * Gestion des photos pensée pour le téléphone : une grande zone "Ajouter
 * une photo" (ouvre la galerie ou l'appareil photo ; glisser-déposer sur
 * ordinateur) et un bouton "Supprimer" sous chaque photo, sans étape de
 * confirmation.
 */
export function PhotoManager({ initialPhotos, maxPhotos }: PhotoManagerProps) {
  const t = useTranslations("profileEdit");
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAdd = photos.length < maxPhotos;

  async function upload(file: File) {
    if (!csrfToken) return;
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && canAdd && !uploading) void upload(file);
  }

  async function handleDelete(mediaId: string) {
    if (!csrfToken) return;
    setDeletingId(mediaId);
    const response = await fetch(`/api/provider/profile/photos/${mediaId}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrfToken },
    });
    setDeletingId(null);
    if (response.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      router.refresh();
    } else {
      setError(t("photoDeleteError"));
    }
  }

  return (
    <Card className="flex w-full max-w-2xl flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg font-medium text-ink2">{t("photosTitle")}</h2>
        <p className="text-sm text-ink2-muted">{t("photosHint")}</p>
      </div>

      {canAdd ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-accent bg-accent-soft" : "border-hairline2 bg-surface-raised hover:border-accent"
          } ${uploading || !csrfToken ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading || !csrfToken}
            className="sr-only"
          />
          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-accent-foreground">
            +
          </span>
          <span className="text-base font-medium text-ink2">{uploading ? t("photoUploading") : t("photoAdd")}</span>
          <span className="text-sm text-ink2-faint">{t("photoAddHint", { count: photos.length, max: maxPhotos })}</span>
        </label>
      ) : (
        <p className="rounded-xl border border-hairline bg-surface-raised px-4 py-3 text-sm text-ink2-muted">
          {t("photoLimitReached")}
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/provider/profile/photos/${photo.id}/preview`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <Badge variant={STATUS_BADGE_VARIANT[photo.status]} className="self-start">
                {t(`photoStatus.${photo.status}`)}
              </Badge>
              {photo.status === "REJECTED" && photo.rejectionReason && (
                <p className="text-xs text-danger">{photo.rejectionReason}</p>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-hairline2 px-3 py-2 text-sm text-ink2-muted transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path
                    d="M4 6h12M8 6V4.5h4V6m-6 0 .7 9.5h6.6L14 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("photoDelete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
