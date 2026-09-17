import { useLayoutEffect, useRef, type UIEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AssetCard } from "@/features/assets/AssetCard";
import { SkeletonCard } from "@/features/assets/GridStates";
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
  outOfFilterIds: Set<string>;
  activeId: string | null;
  onSelect: (id: string, extend: boolean) => void;
  onOpen: (id: string) => void;
  onNearEnd: () => void;
}

export function AssetGrid({
  assets,
  hasMore,
  selectedIds,
  outOfFilterIds,
  activeId,
  onSelect,
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

  // Index of the first asset in the top visible row, updated while scrolling.
  const topAssetIndex = useRef(0);
  const previousColumns = useRef(columns);

  // Layout effect so the corrected rows are drawn before the browser paints.
  useLayoutEffect(() => {
    // The virtualizer caches row heights. When the width changes the height, tell it to recalculate.
    virtualizer.measure();

    // Opening the detail panel (or resizing) changes the number of columns, so every
    // card moves to a different row. Scroll so the card that was at the top stays at the top.
    if (previousColumns.current !== columns) {
      previousColumns.current = columns;
      virtualizer.scrollToIndex(Math.floor(topAssetIndex.current / columns), {
        align: "start",
      });
    }
  }, [rowHeight, columns, virtualizer]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const grid = event.currentTarget;
    const topRow = Math.max(0, Math.floor((grid.scrollTop - PADDING) / rowHeight));
    // Only update when the top row really changed. Otherwise opening and closing the
    // panel would each round down to the start of a row and drift upwards.
    if (Math.floor(topAssetIndex.current / columns) !== topRow) {
      topAssetIndex.current = topRow * columns;
    }

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
      <AssetCard
        key={asset.id}
        asset={asset}
        isSelected={selectedIds.has(asset.id)}
        isOutOfFilter={outOfFilterIds.has(asset.id)}
        isActive={activeId === asset.id}
        onSelect={onSelect}
        onOpen={onOpen}
      />
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
