import { memo } from "react";
import { Thumbnail } from "@/features/assets/Thumbnail";
import { formatBytes, formatDate, statusLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";

interface Props {
  asset: Asset;
  isSelected: boolean;
  isOutOfFilter: boolean;
  isActive: boolean;
  onSelect: (id: string, extend: boolean) => void;
  onOpen: (id: string) => void;
}

// memo: React skips this card when its props haven't changed.
// Each card gets true/false for selected and active, not the whole selection,
// so ticking one card only changes that card's props.
export const AssetCard = memo(function AssetCard({
  asset,
  isSelected,
  isOutOfFilter,
  isActive,
  onSelect,
  onOpen,
}: Props) {
  return (
    <div
      className={
        "card" +
        (isSelected ? " card--selected" : "") +
        (isActive ? " card--active" : "")
      }
      // Plain click opens the asset; shift-click extends the selection instead.
      onClick={(e) =>
        e.shiftKey ? onSelect(asset.id, true) : onOpen(asset.id)
      }
    >
      <Thumbnail asset={asset} className="card__thumb" />
      {isOutOfFilter && (
        <span className="card__note">No longer matches this filter</span>
      )}
      <div className="card__body">
        <p className="card__name" title={asset.name}>
          {asset.name}
        </p>
        <p className="muted">
          {asset.kind} · {formatBytes(asset.sizeBytes)} ·{" "}
          {formatDate(asset.updatedAt)}
        </p>
        <span className={`pill pill--${asset.status}`}>
          {statusLabel(asset.status)}
        </span>
      </div>
      <input
        type="checkbox"
        className="card__check"
        checked={isSelected}
        readOnly
        onClick={(e) => {
          e.stopPropagation();
          onSelect(asset.id, e.shiftKey);
        }}
      />
    </div>
  );
});
