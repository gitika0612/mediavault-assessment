import { bulkSetStatus } from "@/api/client";
import type { Asset, AssetStatus, BulkResult } from "@/lib/types";

// The server refuses more than 50 ids per request.
const CHUNK_SIZE = 50;
// At most this many requests at once, so a big selection doesn't flood the rate limit.
const MAX_IN_FLIGHT = 3;

export interface BulkFailure {
  id: string;
  code: string;
}

export interface BulkOutcome {
  updated: Asset[];
  failures: BulkFailure[];
}

function chunk<T>(list: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < list.length; i += size) groups.push(list.slice(i, i + size));
  return groups;
}

// Runs the tasks with at most `limit` of them in flight.
async function runWithLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]!();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );
  return results;
}

// A 207 means some ids worked and some didn't, so split them.
function splitResults(result: BulkResult): BulkOutcome {
  const updated: Asset[] = [];
  const failures: BulkFailure[] = [];
  for (const item of result.results) {
    if (item.ok) updated.push(item.asset);
    else failures.push({ id: item.id, code: item.code });
  }
  return { updated, failures };
}

export async function setStatusInChunks(
  ids: string[],
  status: AssetStatus
): Promise<BulkOutcome> {
  const tasks = chunk(ids, CHUNK_SIZE).map((group) => async (): Promise<BulkOutcome> => {
    try {
      return splitResults(await bulkSetStatus(group, status));
    } catch {
      // The whole request failed, so nothing in this group changed.
      return {
        updated: [],
        failures: group.map((id) => ({ id, code: "request_failed" })),
      };
    }
  });

  const outcomes = await runWithLimit(tasks, MAX_IN_FLIGHT);
  return {
    updated: outcomes.flatMap((o) => o.updated),
    failures: outcomes.flatMap((o) => o.failures),
  };
}
