import { useQuery } from "@tanstack/react-query";
import { getAsset } from "@/api/client";
import { withRetry } from "@/api/retry";
import { userMessage } from "@/lib/userMessage";

// One asset for the detail panel. The id is the cache key, so opening another
// asset can't be overtaken by a slow answer for the previous one.
export function useAsset(id: string) {
  const result = useQuery({
    queryKey: ["asset", id],
    queryFn: ({ signal }) =>
      withRetry(() => getAsset(id, signal), { attempts: 3, signal }),
    staleTime: Infinity,
  });

  return {
    asset: result.data ?? null,
    loadError: result.error ? userMessage(result.error) : null,
    isLoading: result.isPending,
  };
}
