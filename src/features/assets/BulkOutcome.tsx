import { statusLabel } from "@/lib/format";
import type { AssetStatus } from "@/lib/types";

export interface FailedAsset {
  id: string;
  name: string;
  code: string;
}

export interface BulkSummary {
  status: AssetStatus;
  total: number;
  applied: number;
  failures: FailedAsset[];
}

// legal_hold and not_found will never succeed, so those get no retry.
const REASONS: Record<string, { short: string; long: string; retryable: boolean }> = {
  legal_hold: {
    short: "on legal hold",
    long: "on legal hold, so they can never be changed",
    retryable: false,
  },
  not_found: { short: "no longer exist", long: "no longer exist", retryable: false },
  conflict: {
    short: "changed at the same time",
    long: "were changed at the same time",
    retryable: true,
  },
  request_failed: {
    short: "in a failed request",
    long: "were in a request that failed",
    retryable: true,
  },
};
const UNKNOWN = { short: "failed", long: "couldn't be changed", retryable: true };

function groupByReason(failures: FailedAsset[]): Array<[string, FailedAsset[]]> {
  const groups = new Map<string, FailedAsset[]>();
  for (const failure of failures) {
    const group = groups.get(failure.code) ?? [];
    group.push(failure);
    groups.set(failure.code, group);
  }
  return [...groups];
}

export function retryableIds(failures: FailedAsset[]): string[] {
  return failures
    .filter((f) => (REASONS[f.code] ?? UNKNOWN).retryable)
    .map((f) => f.id);
}

interface Props {
  summary: BulkSummary;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  onRetry: (ids: string[]) => void;
  onDismiss: () => void;
}

// One line, so it fits in the bulk bar and never pushes the grid down.
export function BulkOutcome({
  summary,
  detailsOpen,
  onToggleDetails,
  onRetry,
  onDismiss,
}: Props) {
  const { status, total, applied, failures } = summary;
  const retry = retryableIds(failures);
  const reasons = groupByReason(failures)
    .map(([code, group]) => `${group.length} ${(REASONS[code] ?? UNKNOWN).short}`)
    .join(" · ");

  return (
    <div className="outcome" role="status">
      <span className="outcome__text">
        <strong>
          {applied} of {total}
        </strong>{" "}
        {statusLabel(status).toLowerCase()}
        {reasons && ` · ${reasons}`}
      </span>
      {retry.length > 0 && (
        <button onClick={() => onRetry(retry)}>Retry {retry.length}</button>
      )}
      {failures.length > 0 && (
        <button onClick={onToggleDetails}>{detailsOpen ? "Hide" : "Details"}</button>
      )}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

// The names, shown only when asked for.
export function BulkOutcomeDetails({ summary }: { summary: BulkSummary }) {
  return (
    <div className="outcome-details">
      {groupByReason(summary.failures).map(([code, group]) => (
        <p key={code} className="muted">
          <strong>{group.length}</strong> {(REASONS[code] ?? UNKNOWN).long}:{" "}
          {group.map((f) => f.name).join(", ")}
        </p>
      ))}
    </div>
  );
}
