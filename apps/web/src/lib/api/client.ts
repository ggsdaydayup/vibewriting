import { supabase } from "../supabase/client";

const API_BASE = "/api";

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Raw fetch wrapper — returns the Response object so callers can call .json() themselves.
 * Throws on non-2xx status codes.
 */
async function rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = await res.clone().json();
      message = err.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res;
}

/**
 * Typed convenience wrapper — parses JSON and returns T directly.
 * Kept for compatibility with existing code that does `api.get<T>(...)`.
 */
async function typedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await rawRequest(path, options);
  return res.json() as Promise<T>;
}

/** storageClient: returns raw Response (new Phase-2 code pattern) */
export const storageClient = {
  get: (path: string) => rawRequest(path),
  post: (path: string, body: unknown) =>
    rawRequest(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    rawRequest(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    rawRequest(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => rawRequest(path, { method: "DELETE" }),
};

/** api: returns parsed T (backwards-compat, used in Phase-1 code) */
export const api = {
  get: <T>(path: string) => typedRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    typedRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    typedRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    typedRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => typedRequest<T>(path, { method: "DELETE" }),
};

export async function streamRequest(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new Error("Stream request failed");

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (line.startsWith("0:")) {
        try {
          onChunk(JSON.parse(line.slice(2)));
        } catch {
          // ignore
        }
      }
    }
  }
}
