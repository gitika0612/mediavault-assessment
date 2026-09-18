import { isApiError, isRetryable } from "@/api/errors";

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 4000;

const JITTER_MS = 500;

function waitFor(attempt: number, error: unknown): number {
  const suggested = isApiError(error) ? error.retryAfterMs : undefined;

  // 429 and 503 say how long to wait, so wait at least that, plus a little
  // jitter so everything that was refused doesn't come back at the same instant.
  if (suggested !== undefined) {
    return Math.round(suggested + Math.random() * JITTER_MS);
  }

  // Otherwise back off (300ms, 600ms, …) and wait a random part of it, so
  // requests that failed together don't retry together.
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return Math.round(Math.random() * ceiling);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

interface Options {
  // Total tries, including the first one. Retries count against the rate limit,
  // so this is a traffic decision as much as a reliability one.
  attempts: number;
  signal?: AbortSignal;
  // Narrows what counts as retryable, e.g. saves only retry a failed write.
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  run: () => Promise<T>,
  { attempts, signal, shouldRetry = isRetryable }: Options
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const lastTry = attempt >= attempts - 1;
      if (lastTry || !shouldRetry(error)) throw error;
      // A cancelled request stops waiting here instead of retrying for nobody.
      await sleep(waitFor(attempt, error), signal);
    }
  }
}
