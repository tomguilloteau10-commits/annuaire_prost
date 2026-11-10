import { NextResponse } from "next/server";
import type { UploadedDocument } from "@/modules/verification/manual-review.service";

/** Lit un fichier d'un formulaire multipart (null si absent ou vide). */
export async function readUpload(formData: FormData, name: string): Promise<UploadedDocument | null> {
  const file = formData.get(name);
  if (!file || !(file instanceof File) || file.size === 0) return null;
  return { buffer: Buffer.from(await file.arrayBuffer()), contentType: file.type };
}

export function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "true";
}

/** Marge pour les en-têtes multipart et les petits champs texte du formulaire. */
const MULTIPART_OVERHEAD_BYTES = 512 * 1024;

/**
 * Refuse un envoi trop lourd AVANT de le lire : sans ce contrôle,
 * request.formData() chargerait tout le corps en mémoire (même 1 Go) avant
 * que la taille de chaque fichier ne soit vérifiée. Les navigateurs
 * indiquent toujours la taille (Content-Length) pour un envoi de fichier.
 */
export function rejectOversizedUpload(request: Request, maxFileBytes: number, maxFiles = 1): NextResponse | null {
  const declared = Number(request.headers.get("content-length"));
  if (!Number.isFinite(declared) || declared <= 0) {
    return NextResponse.json({ error: "length_required" }, { status: 411 });
  }
  if (declared > maxFileBytes * maxFiles + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  return null;
}
