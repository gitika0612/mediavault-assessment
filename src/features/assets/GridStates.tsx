// Grey cards in the same grid, so the layout doesn't jump when real results arrive.
export function SkeletonGrid() {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="card card--skeleton">
          <div className="card__thumb" />
          <div className="card__body">
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="state">
      <p>Nothing matches these filters.</p>
      <button onClick={onClear}>Clear search and filters</button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="error-text">Couldn't load assets.</p>
      <p className="muted">{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}
