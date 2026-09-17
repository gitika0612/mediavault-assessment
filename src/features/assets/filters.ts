import { useEffect, useState } from "react";
import type { AssetKind, AssetQuery, AssetStatus } from "@/lib/types";

export type Sort = NonNullable<AssetQuery["sort"]>;

export const STATUSES: AssetStatus[] = ["draft", "in_review", "approved", "archived"];
export const KINDS: AssetKind[] = ["image", "video", "document"];
export const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "sizeBytes:desc", label: "Largest first" },
  { value: "createdAt:desc", label: "Newest" },
];
const DEFAULT_SORT: Sort = "updatedAt:desc";

export interface Filters {
  q: string;
  status: AssetStatus[];
  kind: AssetKind[];
  tag: string[];
  sort: Sort;
}

// Unknown values are ignored, so a hand-edited link can't break the app.
function readFilters(): Filters {
  const params = new URLSearchParams(window.location.search);
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const sort = params.get("sort");

  return {
    q: params.get("q") ?? "",
    status: list("status").filter((s): s is AssetStatus => STATUSES.includes(s as AssetStatus)),
    kind: list("kind").filter((k): k is AssetKind => KINDS.includes(k as AssetKind)),
    tag: list("tag"),
    sort: SORTS.some((option) => option.value === sort) ? (sort as Sort) : DEFAULT_SORT,
  };
}

// Empty filters and the default sort are left out to keep links short.
function toUrl(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.kind.length) params.set("kind", filters.kind.join(","));
  if (filters.tag.length) params.set("tag", filters.tag.join(","));
  if (filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);

  const search = params.toString();
  return search ? `?${search}` : window.location.pathname;
}

// The URL is where filters live, so reload, shared links and Back all work.
export function useFilters() {
  const [filters, setFilters] = useState(readFilters);

  // Back/Forward change the URL, so read the filters from it again.
  useEffect(() => {
    const onPopState = () => setFilters(readFilters());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // "push" adds a Back step (filter and sort clicks). "replace" doesn't (typing).
  function updateFilters(change: Partial<Filters>, history: "push" | "replace") {
    const next = { ...filters, ...change };
    setFilters(next);
    if (history === "push") window.history.pushState(null, "", toUrl(next));
    else window.history.replaceState(null, "", toUrl(next));
  }

  return [filters, updateFilters] as const;
}
