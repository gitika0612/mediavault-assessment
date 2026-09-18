import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { listAssets } from "@/api/client";
import { withRetry } from "@/api/retry";
import { userMessage } from "@/lib/userMessage";
import type { Asset, AssetPage, AssetQuery } from "@/lib/types";

const PAGE_SIZE = 50;

function normalize(query: AssetQuery): AssetQuery {
  return {
    ...query,
    q: query.q?.trim() || undefined,
    status: query.status?.length ? [...query.status].sort() : undefined,
    kind: query.kind?.length ? [...query.kind].sort() : undefined,
    tag: query.tag?.length ? [...query.tag].sort() : undefined,
  };
}

// Join all pages into one list. An asset can appear twice if a change moved it
// between pages we've already loaded, so keep only the first copy.
function joinPages(pages: AssetPage[]): Asset[] {
  const seen = new Set<string>();
  const items: Asset[] = [];
  for (const page of pages) {
    for (const asset of page.items) {
      if (!seen.has(asset.id)) {
        seen.add(asset.id);
        items.push(asset);
      }
    }
  }
  return items;
}

export function useAssets(query: AssetQuery) {
  const params = normalize(query);

  const result = useInfiniteQuery({
    // Each search has its own cache entry, so its cursors can never be used for another search.
    queryKey: ["assets", params],
    // "" means the first page.
    initialPageParam: "",
    // Retries the server's random 503s and rate limits; a cancelled search stops waiting.
    queryFn: ({ signal, pageParam }) =>
      withRetry(
        () =>
          listAssets(
            { ...params, limit: PAGE_SIZE, cursor: pageParam || undefined },
            signal
          ),
        { attempts: 3, signal }
      ),
    // No cursor means we've reached the end.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Keep showing the last results while the next search loads, instead of flashing empty.
    placeholderData: keepPreviousData,
    // Don't refetch a loaded list on its own: that would reload every page at once.
    staleTime: Infinity,
  });

  const pages = result.data?.pages;
  const items = useMemo(() => (pages ? joinPages(pages) : []), [pages]);

  function loadMore() {
    // One page at a time. Never while the previous search's cards are showing:
    // their cursor belongs to that search and the server would reject it.
    if (!result.hasNextPage || result.isFetching || result.isPlaceholderData)
      return;
    // After a failed page, wait for the user to press Try again.
    if (result.isFetchNextPageError) return;
    // Two scroll events can arrive before the next render. If a page is already
    // loading, reuse that request instead of cancelling it and sending another.
    void result.fetchNextPage({ cancelRefetch: false });
  }

  const loadMoreFailed = result.isFetchNextPageError;
  // The newest page has the most up-to-date total.
  const lastPage = pages ? pages[pages.length - 1] : undefined;

  return {
    items,
    total: lastPage?.total ?? 0,
    // After a failed page, stop showing placeholder cards: nothing is loading until Try again.
    hasMore: result.hasNextPage && !loadMoreFailed,
    // Changes whenever the search changes. Used to start a new search at the top.
    searchKey: JSON.stringify(params),
    // No results to show yet (first load, or after an error).
    hasData: pages !== undefined,
    // Results are on screen but a new search is loading (not just the next page).
    isUpdating:
      result.isFetching && !result.isFetchingNextPage && pages !== undefined,
    isFetching: result.isFetching,
    // React Query holds queries back while the browser is offline instead of
    // failing them, so say so rather than leaving the last search on screen.
    isWaitingForConnection: result.isPaused,
    // A failed next page doesn't count here, so it won't replace the cards already loaded.
    error: result.error && !loadMoreFailed ? userMessage(result.error) : null,
    retry: () => void result.refetch(),
    loadMore,
    loadMoreError: loadMoreFailed && result.error ? userMessage(result.error) : null,
    retryLoadMore: () => void result.fetchNextPage(),
  };
}
