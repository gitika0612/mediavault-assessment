import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAsset, updateAsset } from "@/api/client";
import { isApiError } from "@/api/errors";
import { withRetry } from "@/api/retry";
import { putAssetsInCache } from "@/features/assets/cache";
import { Thumbnail } from "@/features/assets/Thumbnail";
import { useAsset } from "@/features/assets/useAsset";
import {
  formatBytes,
  formatDate,
  formatDuration,
  statusLabel,
} from "@/lib/format";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { userMessage } from "@/lib/userMessage";
import type { AssetStatus } from "@/lib/types";

const STATUSES: AssetStatus[] = ["draft", "in_review", "approved", "archived"];

interface Props {
  id: string;
  onClose: () => void;
}

export function AssetDetail({ id, onClose }: Props) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const { asset, loadError, isLoading } = useAsset(id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The status the user asked for, kept while we ask them about a conflict.
  const [wanted, setWanted] = useState<AssetStatus | null>(null);

  useEffect(() => {
    setSaveError(null);
    setWanted(null);
  }, [id]);

  async function save(next: AssetStatus, version: number) {
    setSaving(true);
    setSaveError(null);
    try {
      // Only retry the server's random write failure: it happens before the change
      // is applied, so sending it again is safe. A dropped connection isn't, because
      // the change may already have gone through.
      const updated = await withRetry(
        () => updateAsset(id, version, { status: next }),
        {
          attempts: 2,
          shouldRetry: (error) =>
            isApiError(error) && error.code === "write_failed",
        }
      );
      // Update the panel and the card, so the grid doesn't go stale.
      queryClient.setQueryData(["asset", id], updated);
      putAssetsInCache(queryClient, [updated]);
      setWanted(null);
    } catch (error) {
      if (isApiError(error) && error.code === "version_conflict") {
        // Someone changed it since we loaded it. Show their version and ask,
        // rather than quietly overwriting their decision.
        const fresh = await getAsset(id);
        queryClient.setQueryData(["asset", id], fresh);
        putAssetsInCache(queryClient, [fresh]);
        setWanted(next);
      } else {
        setSaveError(userMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="panel">
      <div className="panel__head">
        <h2>Asset detail</h2>
        <button onClick={onClose}>Close</button>
      </div>

      {loadError && <p className="error">{loadError}</p>}
      {isLoading && <p className="muted">Loading…</p>}

      {asset && (
        <div className="panel__body">
          {wanted && (
            <div className="conflict" role="alert">
              <p>
                This asset changed since you opened it — it's now{" "}
                {statusLabel(asset.status)}. Apply your change again?
              </p>
              <div className="row">
                <button disabled={saving} onClick={() => save(wanted, asset.version)}>
                  Apply {statusLabel(wanted).toLowerCase()}
                </button>
                <button disabled={saving} onClick={() => setWanted(null)}>
                  Keep current
                </button>
              </div>
            </div>
          )}

          {saveError && <p className="error">{saveError}</p>}

          <Thumbnail key={asset.id} asset={asset} className="panel__thumb" />
          <h3>{asset.name}</h3>
          <dl className="facts">
            <dt>Id</dt>
            <dd>{asset.id}</dd>
            <dt>Kind</dt>
            <dd>{asset.kind}</dd>
            <dt>Size</dt>
            <dd>{formatBytes(asset.sizeBytes)}</dd>
            {asset.width && (
              <>
                <dt>Dimensions</dt>
                <dd>
                  {asset.width}×{asset.height}
                </dd>
              </>
            )}
            {asset.durationSec && (
              <>
                <dt>Duration</dt>
                <dd>{formatDuration(asset.durationSec)}</dd>
              </>
            )}
            <dt>Owner</dt>
            <dd>{asset.owner.name}</dd>
            <dt>Updated</dt>
            <dd>{formatDate(asset.updatedAt)}</dd>
            <dt>Version</dt>
            <dd>{asset.version}</dd>
          </dl>

          {asset.tags.length > 0 && (
            <ul className="tags">
              {asset.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}

          <p className="muted">Status</p>
          <div className="row">
            {STATUSES.map((status) => (
              <button
                key={status}
                disabled={saving || !online || status === asset.status}
                onClick={() => save(status, asset.version)}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
          {saving && <p className="muted">Saving…</p>}
        </div>
      )}
    </aside>
  );
}
