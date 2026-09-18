import { isApiError } from "@/api/errors";

const OUR_BUGS = ["bad_request", "bad_cursor", "stale_cursor", "too_many_ids"];

const BY_CODE: Record<string, string> = {
  rate_limited: "MediaVault is busy right now. Wait a moment and try again.",
  upstream_unavailable: "Search is briefly unavailable. Try again in a moment.",
  write_failed: "That change didn't save. Try again.",
  version_conflict:
    "This asset changed since you opened it — apply your change again?",
  legal_hold: "On legal hold — this asset can't be archived.",
  invalid_name: "Names need at least 3 characters.",
  invalid_status: "That status isn't allowed.",
  invalid_tags: "Those tags aren't allowed.",
  not_found: "This asset no longer exists.",
};

// The one place an error becomes something a person reads.
export function userMessage(error: unknown): string {
  if (!isApiError(error)) return "Something went wrong. Try again.";

  if (error.kind === "offline") {
    return "You're offline. This will work again when you reconnect.";
  }
  if (error.kind === "network") {
    return "Couldn't reach MediaVault. Check your connection and try again.";
  }

  if (OUR_BUGS.includes(error.code)) {
    console.warn("Bad request from the app:", error.code, error.message);
    return "Something went wrong on our side. Try reloading the page.";
  }

  return BY_CODE[error.code] ?? "Something went wrong. Try again.";
}
