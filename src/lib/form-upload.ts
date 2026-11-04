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
