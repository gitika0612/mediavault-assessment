import { useState } from "react";
import { thumbnailUrl } from "@/api/client";
import { kindLabel } from "@/lib/format";
import type { Asset } from "@/lib/types";

interface Props {
  asset: Asset;
  className: string;
}

export function Thumbnail({ asset, className }: Props) {
  const [failed, setFailed] = useState(false);

  // No request at all when the asset says there's no thumbnail.
  // If a request still fails (404), show the same placeholder.
  if (!asset.hasThumbnail || failed) {
    return (
      <div className={`${className} thumb-placeholder`} aria-hidden="true">
        {kindLabel(asset.kind)}
      </div>
    );
  }

  return (
    <img
      className={className}
      src={thumbnailUrl(asset.id)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
