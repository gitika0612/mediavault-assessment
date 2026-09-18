import { statusLabel } from "@/lib/format";
import type { AssetStatus } from "@/lib/types";

// The four statuses are a pipeline, so the dot fills up as an asset moves along it:
// empty ring, half, solid, then solid but faded once filed. Drawn in CSS, so every
// dot is the same size and sits on the same line.
export function StatusDot({ status }: { status: AssetStatus }) {
  return <span className={`dot dot--${status}`} aria-hidden="true" />;
}

export function StatusPill({ status }: { status: AssetStatus }) {
  return (
    <span className={`pill pill--${status}`}>
      <StatusDot status={status} />
      {statusLabel(status)}
    </span>
  );
}
