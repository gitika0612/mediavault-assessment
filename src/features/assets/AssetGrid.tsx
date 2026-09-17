import type { UIEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { thumbnailUrl } from "@/api/client";
import { SkeletonCard } from "@/features/assets/GridStates";
import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import { useElementWidth } from "@/lib/useElementWidth";
import type { Asset } from "@/lib/types";

// Keep these in sync with styles.css.
const MIN_CARD_WIDTH = 220;
const GAP = 12;
const PADDING = 16;
const CARD_BODY_HEIGHT = 104;

interface Props {
  assets: Asset[];
  hasMore: boolean;
  selectedIds: Set<string>;
  activeId: string | null;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onNearEnd: () => void;
}

export function AssetGrid({
  assets,
  hasMore,
  selectedIds,
  activeId,
  onToggleSelect,
  onOpen,
  onNearEnd,
}: Props) {
  const { ref: scrollRef, width } = useElementWidth();

  // Same idea as the CSS grid: as many 220px columns as fit.
  const columns = Math.max(
    1,
    Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP))
  );
  const cardWidth = (width - GAP * (columns - 1)) / columns;
  // Every row is the same height: a 16:10 thumbnail, the card body, and the gap below.
  const rowHeight = Math.round((cardWidth * 10) / 16) + CARD_BODY_HEIGHT + GAP;

  // While more pages exist, add one row of placeholders at the end.
  // The next page fills space that's already there, so nothing jumps.
  const rowCount = Math.ceil(assets.length / columns) + (hasMore ? 1 : 0);

  // Only the rows near the screen are rendered; the rest is empty space of the right height.
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
    paddingStart: PADDING,
    paddingEnd: PADDING,
  });

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const grid = event.currentTarget;
    // Ask for the next page when we're within one screen of the bottom.
    if (
      grid.scrollTop + grid.clientHeight >=
      grid.scrollHeight - grid.clientHeight
    ) {
      onNearEnd();
    }
  }

  function renderCell(index: number) {
    const asset = assets[index];
    if (!asset) {
      return hasMore ? <SkeletonCard key={`skeleton-${index}`} /> : null;
    }

    return (
      <div
        key={asset.id}
        className={
          "card" +
          (selectedIds.has(asset.id) ? " card--selected" : "") +
          (activeId === asset.id ? " card--active" : "")
        }
        onClick={() => onOpen(asset.id)}
      >
        <img className="card__thumb" src={thumbnailUrl(asset.id)} alt="" />
        <div className="card__body">
          <p className="card__name" title={asset.name}>
            {asset.name}
          </p>
          <p className="muted">
            {asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
            {formatDate(asset.updatedAt)}
          </p>
          <span className={`pill pill--${asset.status}`}>
            {statusLabel(asset.status)}
          </span>
        </div>
        <input
          type="checkbox"
          className="card__check"
          checked={selectedIds.has(asset.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect(asset.id)}
        />
      </div>
    );
  }

  return (
    <div className="grid-scroller" ref={scrollRef} onScroll={handleScroll}>
      <div className="grid-rows" style={{ height: virtualizer.getTotalSize() }}>
        {/* Wait for the first width measurement so columns are right from the start. */}
        {width > 0 &&
          virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              className="grid-row"
              style={{
                height: row.size - GAP,
                transform: `translateY(${row.start}px)`,
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {Array.from({ length: columns }, (_, column) =>
                renderCell(row.index * columns + column)
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
