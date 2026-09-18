// Codes the API sends in `{ error: { code } }`.
const API_ERROR_CODES = [
  "bad_request",
  "too_many_ids",
  "bad_cursor",
  "stale_cursor",
  "not_found",
  "thumbnail_missing",
  "version_conflict",
  "invalid_status",
  "invalid_name",
  "invalid_tags",
  "legal_hold",
  "rate_limited",
  "write_failed",
  "upstream_unavailable",
] as const;

// "unknown" = no code we recognise, e.g. response at all.
export type ApiErrorCode = (typeof API_ERROR_CODES)[number] | "unknown";

// http: the server answered with an error. network: the request failed. offline: never sent.
export type ApiErrorKind = "http" | "network" | "offline";

export type ApiError = Error & {
  kind: ApiErrorKind;
  status: number; // 0 when there was no response
  code: ApiErrorCode;
  retryAfterMs?: number;
};

export function createApiError(
  kind: ApiErrorKind,
  status: number,
  code: ApiErrorCode,
  message: string,
  retryAfterMs?: number
): ApiError {
  return Object.assign(new Error(message), {
    kind,
    status,
    code,
    retryAfterMs,
  });
}

export function isApiError(value: unknown): value is ApiError {
  return (
    value instanceof Error &&
    "kind" in value &&
    (value.kind === "http" ||
      value.kind === "network" ||
      value.kind === "offline")
  );
}

function toCode(value: unknown): ApiErrorCode {
  return (API_ERROR_CODES as readonly unknown[]).includes(value)
    ? (value as ApiErrorCode)
    : "unknown";
}

// The server only sends whole seconds, so that's all we accept.
function parseRetryAfter(header: string | null): number | undefined {
  const value = header?.trim();
  return value && /^\d+$/.test(value) ? Number(value) * 1000 : undefined;
}

export async function errorFromResponse(res: Response): Promise<ApiError> {
  let code: ApiErrorCode = "unknown";
  let message = res.statusText || `Request failed with ${res.status}`;

  try {
    const error = (await res.json())?.error;
    code = toCode(error?.code);
    if (typeof error?.message === "string") message = error.message;
  } catch {
    // Not JSON. Keep the defaults.
  }

  return createApiError(
    "http",
    res.status,
    code,
    message,
    parseRetryAfter(res.headers.get("retry-after"))
  );
}

// Rate limited, or the server briefly failed. 400/404/409/422 would fail the same way again.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function isRetryable(error: unknown): boolean {
  // Aborts and unexpected errors are not retried.
  if (!isApiError(error)) return false;
  // Nothing will work until we're back online.
  if (error.kind === "offline") return false;
  // The connection may just have blipped.
  if (error.kind === "network") return true;
  return RETRYABLE_STATUS.has(error.status);
}
