import { useTranslations } from "next-intl";

/**
 * Aperçu d'une pièce déposée, servie déchiffrée par la route réservée à
 * l'admin (/api/admin/verification-documents). Jamais d'URL publique.
 */
export function DocumentPreview({
  document,
}: {
  document: { id: string; kind: string; contentType: string; purgeAt: Date };
}) {
  const t = useTranslations("moderation.documents");
  const src = `/api/admin/verification-documents/${document.id}`;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-medium uppercase tracking-wide text-ink2-faint">
        {t(`kinds.${document.kind}`)}
      </figcaption>
      {document.contentType === "application/pdf" ? (
        <object data={src} type="application/pdf" className="h-72 w-full rounded-xl border border-hairline bg-surface-raised">
          <p className="p-4 text-sm text-ink2-muted">{t("pdfFallback")}</p>
        </object>
      ) : (
        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={t(`kinds.${document.kind}`)}
            className="max-h-72 w-full rounded-xl border border-hairline bg-surface-raised object-contain"
          />
        </a>
      )}
      <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:text-accent-hover">
        {t("open")} ↗
      </a>
    </figure>
  );
}
