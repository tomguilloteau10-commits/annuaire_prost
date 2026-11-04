/**
 * Appel d'API côté navigateur qui ne lève jamais d'exception : une coupure
 * réseau (téléphone sans connexion, wifi instable) renvoie `status: 0` au
 * lieu de planter le formulaire, pour afficher un message clair.
 */
export type SendResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error?: string; field?: string; reason?: string };

export async function sendRequest<T = unknown>(
  url: string,
  options: { method: string; csrfToken: string; json?: unknown; formData?: FormData },
): Promise<SendResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: {
        "x-csrf-token": options.csrfToken,
        ...(options.json !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.formData ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    });
  } catch {
    return { ok: false, status: 0, error: "network" };
  }

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: string; field?: string; reason?: string })
    | null;
  if (!response.ok) {
    return { ok: false, status: response.status, error: body?.error, field: body?.field, reason: body?.reason };
  }
  return { ok: true, status: response.status, data: body as T };
}
