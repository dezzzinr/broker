/**
 * Tiny client-side API helper.
 *
 * Every endpoint answers with `{ ok, data }` or `{ ok: false, error, fields }`,
 * so components can `await api("/api/…")` and get typed data or a thrown
 * `ApiRequestError` carrying per-field messages for form rendering.
 */

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {}
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Send as multipart/form-data instead of JSON. */
  form?: FormData;
}

export async function api<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body, form, headers, ...rest } = options;

  const init: RequestInit = { ...rest, headers: { ...(headers ?? {}) } };
  if (form) {
    init.body = form;
  } else if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiRequestError("Network error — check your connection and try again.", 0);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok || !payload?.ok) {
    throw new ApiRequestError(
      payload?.error ?? `Request failed (${response.status})`,
      response.status,
      payload?.fields ?? {}
    );
  }

  return payload.data as T;
}

export const apiGet = <T,>(url: string) => api<T>(url, { method: "GET" });
export const apiPost = <T,>(url: string, body?: unknown) => api<T>(url, { method: "POST", body });
export const apiPatch = <T,>(url: string, body?: unknown) => api<T>(url, { method: "PATCH", body });
export const apiDelete = <T,>(url: string) => api<T>(url, { method: "DELETE" });

/** Unwraps the `{ ok, data }` envelope returned by list endpoints. */
export type Paged<T> = { rows: T[]; total: number };
