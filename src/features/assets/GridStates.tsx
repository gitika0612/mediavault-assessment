// A grey card with the same shape as a real one.
export function SkeletonCard() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__thumb" />
      <div className="card__body">
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--short" />
      </div>
    </div>
  );
}

// Grey cards in the same grid, so the layout doesn't jump when real results arrive.
export function SkeletonGrid() {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Every state that takes over the result area has the same shape:
// what happened, a quieter line of detail, then the way out.
export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="state">
      <p className="state__title">Nothing matches these filters.</p>
      <p className="muted">Try a different search, or clear what's set.</p>
      <button onClick={onClear}>Clear search and filters</button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="state__title">Couldn't load assets.</p>
      <p className="muted">{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

// Shown under the cards when a later page fails, so the pages already loaded stay.
export function LoadMoreError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="banner banner--danger" role="alert">
      <span className="banner__text">
        <strong>Couldn't load more.</strong> {message}
      </span>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}
