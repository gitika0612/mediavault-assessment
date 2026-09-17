import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AssetDetail } from "@/features/assets/AssetDetail";
import { setStatusInChunks } from "@/features/assets/bulk";
import {
  BulkOutcome,
  BulkOutcomeDetails,
  type BulkSummary,
} from "@/features/assets/BulkOutcome";
import {
  applyStatusToCache,
  putAssetsInCache,
  restoreStatusInCache,
} from "@/features/assets/cache";
import { AssetGrid } from "@/features/assets/AssetGrid";
import {
  KINDS,
  SORTS,
  STATUSES,
  useFilters,
  type Sort,
} from "@/features/assets/filters";
import {
  EmptyState,
  ErrorState,
  LoadMoreError,
  SkeletonGrid,
} from "@/features/assets/GridStates";
import { useAssets } from "@/features/assets/useAssets";
import { kindLabel, statusLabel } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { AssetStatus } from "@/lib/types";

function toggle<T>(list: T[], value: T, checked: boolean): T[] {
  return checked ? [...list, value] : list.filter((x) => x !== value);
}

export function App() {
  const queryClient = useQueryClient();
  const [filters, updateFilters] = useFilters();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkSummary | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Assets we just changed that no longer match the status filter, marked on the card.
  const [outOfFilter, setOutOfFilter] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  // Search once typing pauses, not on every keystroke.
  const debouncedQ = useDebouncedValue(filters.q, 400);
  const {
    items,
    total,
    hasMore,
    searchKey,
    hasData,
    isUpdating,
    isFetching,
    error,
    retry,
    loadMore,
    loadMoreError,
    retryLoadMore,
  } = useAssets({
    q: debouncedQ,
    status: filters.status,
    kind: filters.kind,
    tag: filters.tag,
    sort: filters.sort,
  });

  // The list and the last card clicked, read by the selection handler without
  // making it a new function on every render (which would re-render every card).
  const itemsRef = useRef(items);
  const anchorId = useRef<string | null>(null);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // A new search starts with nothing selected, so a bulk action can't hit cards
  // that are no longer on screen.
  useEffect(() => {
    setSelectedIds(new Set());
    setSummary(null);
    setOutOfFilter(new Set());
    anchorId.current = null;
  }, [searchKey]);

  // useCallback keeps this the same function on every render. If it changed,
  // every memoized card would see a new prop and re-render anyway.
  const selectCard = useCallback((id: string, extend: boolean) => {
    const ids = itemsRef.current.map((asset) => asset.id);
    const anchor = anchorId.current;

    // Shift-click adds everything between the last clicked card and this one.
    if (extend && anchor) {
      const from = ids.indexOf(anchor);
      const to = ids.indexOf(id);
      if (from !== -1 && to !== -1) {
        const [start, end] = from < to ? [from, to] : [to, from];
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const rangeId of ids.slice(start, end + 1)) next.add(rangeId);
          return next;
        });
        return;
      }
    }

    anchorId.current = id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  async function applyBulkStatus(ids: string[], next: AssetStatus) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setSummary(null);
    setApplying(true);

    // Remember each status so a failed asset can be put back, and each name so
    // the outcome can say which assets didn't change.
    const previous = new Map<string, AssetStatus>();
    const names = new Map<string, string>();
    for (const asset of itemsRef.current) {
      if (idSet.has(asset.id)) {
        previous.set(asset.id, asset.status);
        names.set(asset.id, asset.name);
      }
    }

    // Show the change straight away, before the server answers.
    applyStatusToCache(queryClient, idSet, next);

    // Sent in groups of 50 (the server's cap), at most 3 requests at a time.
    const { updated, failures } = await setStatusInChunks(ids, next);

    // Keep the successes (with the server's new version) and undo only the failures.
    putAssetsInCache(queryClient, updated);
    const rollback = new Map<string, AssetStatus>();
    for (const failure of failures) {
      const status = previous.get(failure.id);
      if (status) rollback.set(failure.id, status);
    }
    restoreStatusInCache(queryClient, rollback);

    // A status filter can stop matching the assets we just changed. They stay
    // where they are (removing rows would jump the scroll), but get a note.
    if (filters.status.length > 0 && !filters.status.includes(next)) {
      setOutOfFilter((prev) => {
        const marked = new Set(prev);
        for (const asset of updated) marked.add(asset.id);
        return marked;
      });
    }

    setSummary({
      status: next,
      total: ids.length,
      applied: updated.length,
      failures: failures.map((failure) => ({
        ...failure,
        name: names.get(failure.id) ?? failure.id,
      })),
    });
    // Leave the failures selected so they can be retried.
    setSelectedIds(new Set(failures.map((failure) => failure.id)));
    setApplying(false);
  }


  return (
    <div className="app">
      <header className="topbar">
        <h1>MediaVault</h1>
        <input
          className="search"
          type="search"
          placeholder="Search assets"
          value={filters.q}
          onChange={(e) => updateFilters({ q: e.target.value }, "replace")}
        />
        <select
          value={filters.sort}
          onChange={(e) =>
            updateFilters({ sort: e.target.value as Sort }, "push")
          }
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </header>

      <div className="filters">
        <span className="muted">Status</span>
        {STATUSES.map((s) => (
          <label key={s}>
            <input
              type="checkbox"
              checked={filters.status.includes(s)}
              onChange={(e) =>
                updateFilters(
                  { status: toggle(filters.status, s, e.target.checked) },
                  "push"
                )
              }
            />
            {statusLabel(s)}
          </label>
        ))}
        <span className="muted">Kind</span>
        {KINDS.map((k) => (
          <label key={k}>
            <input
              type="checkbox"
              checked={filters.kind.includes(k)}
              onChange={(e) =>
                updateFilters(
                  { kind: toggle(filters.kind, k, e.target.checked) },
                  "push"
                )
              }
            />
            {kindLabel(k)}
          </label>
        ))}
        {hasData && (
          <span className="muted">
            {items.length.toLocaleString()} of {total.toLocaleString()} loaded
          </span>
        )}
      </div>

      {/* Always shown, so ticking the first card doesn't push the grid down. */}
      <div className="bulkbar">
        <span className={selectedIds.size === 0 ? "muted" : undefined}>
          {selectedIds.size === 0
            ? "No assets selected"
            : `${selectedIds.size} selected`}
        </span>
        <button
          disabled={items.length === 0}
          onClick={() => setSelectedIds(new Set(items.map((a) => a.id)))}
        >
          Select all loaded
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={selectedIds.size === 0 || applying}
            onClick={() => applyBulkStatus([...selectedIds], s)}
          >
            Set {statusLabel(s).toLowerCase()}
          </button>
        ))}
        {applying && <span className="muted">Applying…</span>}
        <button
          disabled={selectedIds.size === 0}
          onClick={() => setSelectedIds(new Set())}
        >
          Clear selection
        </button>

        {summary && (
          <BulkOutcome
            summary={summary}
            detailsOpen={detailsOpen}
            onToggleDetails={() => setDetailsOpen(!detailsOpen)}
            onRetry={(ids) => applyBulkStatus(ids, summary.status)}
            onDismiss={() => setSummary(null)}
          />
        )}
      </div>

      {summary && detailsOpen && <BulkOutcomeDetails summary={summary} />}

      <main className="content">
        <div
          className={isUpdating ? "results results--updating" : "results"}
          aria-busy={isFetching}
        >
          {isUpdating && <p className="results__updating">Updating results…</p>}

          {error && !isFetching ? (
            <ErrorState message={error} onRetry={retry} />
          ) : !hasData ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState
              onClear={() =>
                updateFilters({ q: "", status: [], kind: [], tag: [] }, "push")
              }
            />
          ) : (
            <AssetGrid
              // A new search starts a fresh grid, scrolled to the top.
              key={searchKey}
              assets={items}
              hasMore={hasMore}
              selectedIds={selectedIds}
              outOfFilterIds={outOfFilter}
              activeId={activeId}
              onSelect={selectCard}
              onOpen={setActiveId}
              onNearEnd={loadMore}
            />
          )}

          {loadMoreError && (
            <LoadMoreError message={loadMoreError} onRetry={retryLoadMore} />
          )}
        </div>
        {activeId && (
          <AssetDetail id={activeId} onClose={() => setActiveId(null)} />
        )}
      </main>
    </div>
  );
}
