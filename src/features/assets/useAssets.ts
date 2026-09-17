import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAssets } from "@/api/client";
import type { AssetQuery } from "@/lib/types";

function normalize(query: AssetQuery): AssetQuery {
  return {
    ...query,
    q: query.q?.trim() || undefined,
    status: query.status?.length ? [...query.status].sort() : undefined,
    kind: query.kind?.length ? [...query.kind].sort() : undefined,
    tag: query.tag?.length ? [...query.tag].sort() : undefined,
  };
}

export function useAssets(query: AssetQuery) {
  const params = normalize(query);

  const result = useQuery({
    // Each response is stored under the search it was for, so an old one can't show up under a new search. (fix 1)
    queryKey: ["assets", params],
    queryFn: ({ signal }) => listAssets(params, signal),
    // Keep showing the last results while the next search loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });

  return {
    items: result.data?.items ?? [],
    total: result.data?.total ?? 0,
    // No results to show yet (first load, or after an error).
    hasData: result.data !== undefined,
    // Results are on screen but a newer request is running.
    isUpdating: result.isFetching && result.data !== undefined,
    isFetching: result.isFetching,
    error: result.error ? result.error.message : null,
    retry: () => void result.refetch(),
  };
}
