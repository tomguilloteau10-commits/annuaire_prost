"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCsrfToken } from "@/lib/use-csrf-token";
import { sendRequest } from "@/lib/send-request";
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
  /** Taille maximale d'une photo, en octets (même limite que le serveur). */
  maxBytes: number;
  /** Prévient le formulaire du nombre de photos utilisables (non refusées). */
  onPhotosChange?: (usableCount: number) => void;
}

const STATUS_BADGE_VARIANT: Record<PhotoItem["status"], BadgeVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  });
}

/**
 * Gestion des photos pensée pour le téléphone : une grande zone "Ajouter
 * des photos" (galerie ou appareil photo, plusieurs à la fois ;
 * glisser-déposer sur ordinateur) et un bouton "Supprimer" sous chaque
 * photo, sans étape de confirmation. Format et taille sont vérifiés avant
 * l'envoi, avec un message clair par photo refusée ; le serveur revérifie.
 * La première photo est la photo principale ; une photo en attente n'est
 * visible des clients qu'après validation par l'équipe.
 */
export function PhotoManager({ initialPhotos, maxPhotos, maxBytes, onPhotosChange }: PhotoManagerProps) {
  const t = useTranslations("profileEdit");
  const csrfToken = useCsrfToken();
  const [photos, setPhotos] = useState(initialPhotos);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const uploading = progress !== null;
  const canAdd = photos.length < maxPhotos;

  const usableCount = photos.filter((p) => p.status !== "REJECTED").length;
  useEffect(() => {
    onPhotosChange?.(usableCount);
  }, [usableCount, onPhotosChange]);

  function uploadErrorMessage(name: string, error?: string, status?: number): string {
    if (status === 0) return t("photoErrors.network", { name });
    if (error === "file_too_large") return t("photoErrors.tooLarge", { name, max: megabytes(maxBytes) });
    if (error === "unsupported_content_type") return t("photoErrors.format", { name });
    if (error === "photo_limit_reached") return t("photoErrors.limit", { max: maxPhotos });
    return t("photoErrors.generic", { name });
  }

  async function uploadFiles(files: File[]) {
    if (!csrfToken || files.length === 0) return;
    const room = maxPhotos - photos.length;
    const messages: string[] = [];
    if (files.length > room) messages.push(t("photoErrors.tooMany", { max: maxPhotos, room }));

    // Contrôles avant envoi : réponse immédiate, sans attendre le serveur.
    const accepted = files.slice(0, Math.max(room, 0)).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        messages.push(t("photoErrors.format", { name: file.name }));
        return false;
      }
      if (file.size > maxBytes) {
        messages.push(
          t("photoErrors.tooLarge", { name: file.name, max: megabytes(maxBytes) }),
        );
        return false;
      }
      return true;
    });

    setErrors(messages);
    for (const [index, file] of accepted.entries()) {
      setProgress({ current: index + 1, total: accepted.length });
      const formData = new FormData();
      formData.append("file", file);
      const result = await sendRequest<{ mediaId: string }>("/api/provider/profile/photos", {
        method: "POST",
        csrfToken,
        formData,
      });
      if (result.ok) {
        setPhotos((prev) => [...prev, { id: result.data.mediaId, status: "PENDING", rejectionReason: null }]);
      } else {
        messages.push(uploadErrorMessage(file.name, result.error, result.status));
        setErrors([...messages]);
        if (result.error === "photo_limit_reached") break;
      }
    }
    setProgress(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadFiles(files);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (canAdd && !uploading) void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function handleDelete(mediaId: string) {
    if (!csrfToken) return;
    setBusyId(mediaId);
    const result = await sendRequest(`/api/provider/profile/photos/${mediaId}`, { method: "DELETE", csrfToken });
    setBusyId(null);
    if (result.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      setErrors([]);
    } else {
      setErrors([result.status === 0 ? t("photoErrors.networkAction") : t("photoDeleteError")]);
    }
  }

  async function handleMakePrimary(mediaId: string) {
    if (!csrfToken) return;
    setBusyId(mediaId);
    const result = await sendRequest(`/api/provider/profile/photos/${mediaId}`, { method: "PATCH", csrfToken });
    setBusyId(null);
    if (result.ok) {
      setPhotos((prev) => [...prev.filter((p) => p.id === mediaId), ...prev.filter((p) => p.id !== mediaId)]);
    } else {
      setErrors([result.status === 0 ? t("photoErrors.networkAction") : t("photoPrimaryError")]);
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
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleFileChange}
            disabled={uploading || !csrfToken}
            className="sr-only"
          />
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-accent-foreground"
          >
            +
          </span>
          <span className="text-base font-medium text-ink2" aria-live="polite">
            {progress ? t("photoUploadingProgress", progress) : t("photoAdd")}
          </span>
          <span className="text-sm text-ink2-faint">
            {t("photoAddHint", {
              count: photos.length,
              max: maxPhotos,
              size: megabytes(maxBytes),
            })}
          </span>
        </label>
      ) : (
        <p className="rounded-xl border border-hairline bg-surface-raised px-4 py-3 text-sm text-ink2-muted">
          {t("photoLimitReached")}
        </p>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3"
        >
          {errors.map((message) => (
            <p key={message} className="text-sm text-ink2">
              {message}
            </p>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="flex flex-col gap-2">
              <div
                className={`relative aspect-square overflow-hidden rounded-xl border bg-surface-raised ${
                  index === 0 ? "border-accent ring-1 ring-accent" : "border-hairline"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/provider/profile/photos/${photo.id}/preview`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2">
                    <Badge variant="featured">★ {t("photoPrimary")}</Badge>
                  </span>
                )}
              </div>
              <Badge variant={STATUS_BADGE_VARIANT[photo.status]} className="self-start">
                {t(`photoStatus.${photo.status}`)}
              </Badge>
              {photo.status === "PENDING" && <p className="text-xs text-ink2-faint">{t("photoPendingHint")}</p>}
              {photo.status === "REJECTED" && photo.rejectionReason && (
                <p className="text-xs text-danger">{photo.rejectionReason}</p>
              )}
              {index > 0 && photo.status !== "REJECTED" && (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(photo.id)}
                  disabled={busyId === photo.id}
                  className="inline-flex items-center justify-center rounded-full border border-hairline2 px-3 py-2 text-sm text-ink2 transition-colors hover:border-accent/60 disabled:opacity-50"
                >
                  {t("photoMakePrimary")}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={busyId === photo.id}
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
