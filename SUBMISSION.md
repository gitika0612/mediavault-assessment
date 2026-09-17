# Submission

Keep this tight. Bullet points are fine. We read this before we read your code,
and a clear account of your reasoning carries real weight — including where you
chose not to do something.

## Video walkthrough

Paste your Loom (or equivalent) link here. 5–10 minutes.

**Link:**

---

## How to run it

Anything we need to know beyond `npm install && npm run dev`.

## Time spent

Roughly, and how you split it.

---

## Baseline defects found

| # | Defect | Where | Fixed / left / out of scope |
| --- | --- | --- | --- |
| 1 | An older search result can replace a newer one | `useAssets.ts:26–45` | Planned (Task 1) |
| 2 | One request per keystroke | `App.tsx:64`, `useAssets.ts:45` | Planned (Task 1) |
| 3 | Filters and search are lost on reload and can't be shared | `App.tsx` | Planned (Task 1) |
| 4 | Only the first 24 assets can ever be shown | `useAssets.ts:33`, `App.tsx:26` | Planned (Task 2) |
| 5 | Loading, empty and error look the same, and errors keep old results | `AssetGrid.tsx:18–25`, `useAssets.ts:19`, `:39–43` | Planned (Task 1) |
| 6 | Every loaded card is put into the page | `AssetGrid.tsx:29–55` | Planned (Task 2) |
| 7 | Cards collapse into thin lines once many rows load | `styles.css` | Planned (Task 2) |
| 8 | Ticking one checkbox redraws every card | `App.tsx`, `AssetGrid.tsx` | Planned (Task 2) |
| 9 | Thumbnails ignore `hasThumbnail` and all load at once | `AssetGrid.tsx` | Planned (Task 2) |
| 10 | Bulk update fails completely above 50 items | `App.tsx` | Planned (Task 3) |
| 11 | Partial failures can't be seen or recovered | `App.tsx` | Planned (Task 3) |
| 12 | The grid doesn't show the changes you make | `App.tsx` | Planned (Task 3) |
| 13 | Errors are plain text, and nothing retries | `client.ts`, `App.tsx` | Planned (Task 4) |
| 14 | Cards can't be used with a keyboard or screen reader | `AssetGrid.tsx` | Planned (Task 5) |

### Details

**1. An older search result can replace a newer one**
- **Where:** `useAssets.ts:26–45` (result saved at line 30)
- **Problem:** Every response is saved when it arrives, even if the search it belongs to is out of date. Old requests aren't cancelled.
- **Seen:** typing "garden", the "gar" response (459 ms) arrived before "ga" (883 ms), so the older "ga" results overwrote the newer ones.
- **Status:** planned (Task 1)

**2. One request per keystroke**
- **Where:** `App.tsx:64` (search input) and `useAssets.ts:45` (effect re-runs on every query change)
- **Problem:** Each character typed sends a new search immediately. There's no pause to wait for typing to stop, which wastes requests against the rate limit.
- **Seen:** typing "garden" sent 6 requests.
- **Status:** planned (Task 1)

**3. Filters and search are lost on reload and can't be shared**
- **Where:** `App.tsx`
- **Problem:** Search, status and sort live only in memory, not in the URL, so a reload loses them. There are no controls for kind or tag, even though the API supports both.
- **Seen:** searched "garden", ticked Approved, changed sort, reloaded; everything reset and the address bar never changed.
- **Status:** planned (Task 1)

**4. Only the first 24 assets can ever be shown**
- **Where:** `useAssets.ts:33` (nextCursor stored, never read); `App.tsx:26` (limit: 24)
- **Problem:** The server returns a cursor for the next page, but the app never uses it.
- **Seen:** the count always says "24 of 12,400 shown" and scrolling loads nothing more.
- **Status:** planned (Task 2)

**5. Loading, empty and error look the same, and errors keep old results**
- **Where:** `AssetGrid.tsx:18–25`; `useAssets.ts:19` and `:39–43`
- **Problem:** The list starts empty, so while loading the grid says "Nothing matches these filters." When a request fails, the previous search's cards stay on screen under the error, looking like current results.
- **Seen:** "summer" returned 503 and the page showed "503: Search index is warming up." above the older search's cards.
- **Status:** planned (Task 1)

**6. Every loaded card is put into the page**
- **Where:** `AssetGrid.tsx:29–55`
- **Problem:** Every asset becomes DOM elements, including cards far off screen, so the page grows with the list. It's hidden today only because defect 4 limits the list to 24.
- **Seen:** with 24 cards temporarily repeated to 5,000, the page had 35,041 elements (199 at 24 cards).
- **Status:** planned (Task 2)

**7. Cards collapse into thin lines once many rows load**
- **Where:** `styles.css` - `.grid` (fixed height) and `.card` (overflow: hidden)
- **Seen:** with 5,000 cards every card became a thin line
- **Status:** planned (Task 2)

**8. Ticking one checkbox redraws every card**
- **Where:** `App.tsx` - toggleSelect (new Set on every toggle); read by every card at `AssetGrid.tsx` - `checked={selectedIds.has(asset.id)}`
- **Problem:** Selection is one object passed to the whole grid, so changing one checkbox makes React rebuild every card, not just the one that changed.
- **Seen:** React DevTools Profiler, one click re-rendered App and AssetGrid. 4.9 ms at 24 cards, 141.7 ms at 5,000 (dev mode).
- **Status:** planned (Task 2)

**9. Thumbnails ignore hasThumbnail and all load at once**
- **Where:** `AssetGrid.tsx`
- **Problem:** The app requests a thumbnail even when the asset says none exists, so those return 404 and show the browser's broken-image icon. There's no loading="lazy", so every thumbnail downloads even when off screen.
- **Seen:** some cards show a broken-image icon instead of a thumbnail.
- **Status:** planned (Task 2)

**10. Bulk update fails completely above 50 items**
- **Where:** `App.tsx` (applyBulkStatus)
- **Problem:** Every selected id goes in one request. The server rejects more than 50, so nothing is updated.
- **Seen:** selected 72 cards across three searches, clicked "Set approved", got "400: Update at most 50 assets per call."
- **Status:** planned (Task 3)

**11. Partial failures can't be seen or recovered**
- **Where:** `App.tsx`
- **Problem:** After a bulk update the app shows only a count ("19 updated, 5 failed"), not which assets failed or why, even though the server returns that per asset. It then clears the selection, so the failed ones can't be retried.
- **Seen:** "19 updated, 5 failed" and "20 updated, 4 failed", with the selection cleared both times.
- **Status:** planned (Task 3)

**12. The grid doesn't show the changes you make**
- **Where:** `App.tsx` (handleSaved is empty)
- **Problem:** Changing a status, from the detail panel or in bulk, doesn't update the cards. The grid keeps showing old statuses until you search again or reload.
- **Seen:** approved a Draft asset in the panel; the panel said Approved but the card still said Draft.
- **Status:** planned (Task 3)

**13. Errors are plain text, and nothing retries**
- **Where:** `client.ts` and `App.tsx`
- **Problem:** Every failure becomes a "<status>: <message>" string, so code can only tell errors apart by matching text, and users see it as-is. There's no retry, no waiting when the server says to, and no way to cancel a request.
- **Seen:** a search returned 503 and the page showed "503: Search index is warming up." with no retry in the Network tab.
- **Status:** planned (Task 4)

**14. Cards can't be used with a keyboard or screen reader**
- **Where:** `AssetGrid.tsx`
- **Problem:** A card is a plain div with a click handler, so you can't focus it, open it with Enter, or know what it is with a screen reader. The checkboxes have no name, so a screen reader just hears "checkbox".
- **Status:** planned (Task 5)

---

## Key decisions

For each significant choice: what you did, what you rejected, and why. Three to
six of these is about right.

**Data fetching and caching**

**Stale response handling**

**Virtualization approach**

**Optimistic updates and rollback**

**Retry and backoff policy**

**State placement and URL sync**

---

## Performance

Fill in real measurements, not estimates. Say which machine and browser.

| Metric | Before | After | How measured |
| --- | --- | --- | --- |
| Rendered DOM nodes at 5,000 rows loaded | | | |
| Cards re-rendered when toggling one selection | | | |
| Longest task during sustained scroll | | | |
| Requests fired while typing a 6-character query | | | |
| Production bundle, gzipped | | | |

What was the actual bottleneck, and how did you find it?

---

## Accessibility

- Keyboard model you implemented, in one paragraph.
- How you tested it, including any screen reader.
- Known gaps.

---

## Interface decisions

Three or four sentences: what you were optimising for, and the decisions that
follow from it. Then briefly:

- **Visual system.** Your colour, spacing and type decisions, and where they live.
- **Status treatment.** How the four statuses read as a progression, and how they
  stay distinguishable without relying on colour.
- **States.** What you did with loading, empty, error, offline and partial
  failure.
- **Contrast.** What you checked against, and with what.
- **Copy.** Any user-facing message you rewrote and why.

Screenshots in the repo are welcome — link them here.

---

## Trade-offs and cuts

What you deliberately did not do, and what you would do with another day.

## Critique of the API

What you would change about the backend contract, and what it forced you to do in
the client that you would rather not have.

## Anything you would like us to look at

Code you are proud of, or a decision you are unsure about and want to discuss.
