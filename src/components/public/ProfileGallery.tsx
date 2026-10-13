"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Photo principale + rangée de miniatures cliquables. Ne reçoit que des
 * URLs signées de médias APPROVED (getPublicPhotoUrl côté serveur). Sur
 * desktop, la hauteur est plafonnée pour garder les miniatures visibles
 * sans défiler (image en object-cover, le recadrage reste propre).
 */
export function ProfileGallery({ photos, className = "" }: { photos: string[]; className?: string }) {
  const t = useTranslations("profile");
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex];

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl3 border border-hairline bg-surface-raised md:max-h-[62vh]">
        {activePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activePhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink2-faint">
            {t("noPhoto")}
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={t("galleryPhoto", { index: index + 1, total: photos.length })}
              aria-current={index === activeIndex}
              className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                index === activeIndex
                  ? "border-accent ring-1 ring-accent"
                  : "border-hairline opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
