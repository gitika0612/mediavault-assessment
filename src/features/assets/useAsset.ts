import { useQuery } from "@tanstack/react-query";
import { getAsset } from "@/api/client";

// One asset for the detail panel. The id is the cache key, so opening another
// asset can't be overtaken by a slow answer for the previous one.
export function useAsset(id: string) {
  const result = useQuery({
    queryKey: ["asset", id],
    queryFn: ({ signal }) => getAsset(id, signal),
    staleTime: Infinity,
  });

  return {
    asset: result.data ?? null,
    loadError: result.error ? result.error.message : null,
    isLoading: result.isPending,
  };
}
