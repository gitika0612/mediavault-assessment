import { useState } from "react";
import { bulkSetStatus } from "@/api/client";
import { AssetDetail } from "@/features/assets/AssetDetail";
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
  SkeletonGrid,
} from "@/features/assets/GridStates";
import { useAssets } from "@/features/assets/useAssets";
import { kindLabel, statusLabel } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { Asset, AssetStatus } from "@/lib/types";

function toggle<T>(list: T[], value: T, checked: boolean): T[] {
  return checked ? [...list, value] : list.filter((x) => x !== value);
}

export function App() {
  const [filters, updateFilters] = useFilters();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Search once typing pauses, not on every keystroke.
  const debouncedQ = useDebouncedValue(filters.q, 400);
  const { items, total, hasData, isUpdating, isFetching, error, retry } =
    useAssets({
      q: debouncedQ,
      status: filters.status,
      kind: filters.kind,
      tag: filters.tag,
      sort: filters.sort,
      limit: 24,
    });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkStatus(next: AssetStatus) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setNotice(null);
    try {
      // Sends every selected id in one call, which the API refuses above 50.
      const result = await bulkSetStatus(ids, next);
      setNotice(`${result.applied} updated, ${result.failed} failed.`);
      setSelectedIds(new Set());
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Bulk update failed");
    }
  }

  function handleSaved(_asset: Asset) {
    // The list is not told that anything changed, so it shows stale rows.
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
            {items.length} of {total.toLocaleString()} shown
          </span>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="bulkbar">
          <span>{selectedIds.size} selected</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => applyBulkStatus(s)}>
              Set {statusLabel(s).toLowerCase()}
            </button>
          ))}
          <button onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}

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
              assets={items}
              selectedIds={selectedIds}
              activeId={activeId}
              onToggleSelect={toggleSelect}
              onOpen={setActiveId}
            />
          )}
        </div>
        {activeId && (
          <AssetDetail
            id={activeId}
            onClose={() => setActiveId(null)}
            onSaved={handleSaved}
          />
        )}
      </main>
    </div>
  );
}
