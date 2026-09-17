import type { QueryClient } from "@tanstack/react-query";
import type { Asset, AssetPage, AssetStatus } from "@/lib/types";

interface CachedPages {
  pages: AssetPage[];
  pageParams: unknown[];
}

// Runs `change` over every asset in every cached search, so the grid updates
// without refetching (which would reload every loaded page).
function mapCachedAssets(client: QueryClient, change: (asset: Asset) => Asset) {
  client.setQueriesData<CachedPages>({ queryKey: ["assets"] }, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: page.items.map(change) })),
    };
  });
}

// Optimistic step: show the new status before the server answers.
export function applyStatusToCache(
  client: QueryClient,
  ids: Set<string>,
  status: AssetStatus
) {
  mapCachedAssets(client, (asset) =>
    ids.has(asset.id) ? { ...asset, status } : asset
  );
}

// Successes: take the server's asset, which carries the new version.
export function putAssetsInCache(client: QueryClient, assets: Asset[]) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  mapCachedAssets(client, (asset) => byId.get(asset.id) ?? asset);
}

// Failures: put back the status the asset had before.
export function restoreStatusInCache(
  client: QueryClient,
  previous: Map<string, AssetStatus>
) {
  mapCachedAssets(client, (asset) => {
    const status = previous.get(asset.id);
    return status ? { ...asset, status } : asset;
  });
}
