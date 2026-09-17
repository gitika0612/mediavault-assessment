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

| #   | Defect                                                              | Where                                              | Fixed / left / out of scope |
| --- | ------------------------------------------------------------------- | -------------------------------------------------- | --------------------------- |
| 1   | An older search result can replace a newer one                      | `useAssets.ts:26–45`                               | Fixed (Task 1)              |
| 2   | One request per keystroke                                           | `App.tsx:64`, `useAssets.ts:45`                    | Fixed (Task 1)              |
| 3   | Filters and search are lost on reload and can't be shared           | `App.tsx`                                          | Fixed (Task 1)              |
| 4   | Only the first 24 assets can ever be shown                          | `useAssets.ts:33`, `App.tsx:26`                    | Fixed (Task 2)              |
| 5   | Loading, empty and error look the same, and errors keep old results | `AssetGrid.tsx:18–25`, `useAssets.ts:19`, `:39–43` | Fixed (Task 1)              |
| 6   | Every loaded card is put into the page                              | `AssetGrid.tsx:29–55`                              | Fixed (Task 2)              |
| 7   | Cards collapse into thin lines once many rows load                  | `styles.css`                                       | Fixed (Task 1)              |
| 8   | Ticking one checkbox redraws every card                             | `App.tsx`, `AssetGrid.tsx`                         | Fixed (Task 2)              |
| 9   | Thumbnails ignore `hasThumbnail` and all load at once               | `AssetGrid.tsx`                                    | Fixed (Task 2)              |
| 10  | Bulk update fails completely above 50 items                         | `App.tsx`                                          | Planned (Task 3)            |
| 11  | Partial failures can't be seen or recovered                         | `App.tsx`                                          | Planned (Task 3)            |
| 12  | The grid doesn't show the changes you make                          | `App.tsx`                                          | Planned (Task 3)            |
| 13  | Errors are plain text, and nothing retries                          | `client.ts`, `App.tsx`                             | Planned (Task 4)            |
| 14  | Cards can't be used with a keyboard or screen reader                | `AssetGrid.tsx`                                    | Planned (Task 5)            |

Line numbers refer to the baseline commit `25dec63`.

### Details

**1. An older search result can replace a newer one**

- **Where:** `useAssets.ts:26–45` (result saved at line 30)
- **Problem:** Every response is saved when it arrives, even if the search it belongs to is out of date. Old requests aren't cancelled.
- **Seen:** typing "garden", the "gar" response (459 ms) arrived before "ga" (883 ms), so the older "ga" results overwrote the newer ones.
- **Status:** fixed (Task 1). React Query query key per search + abort signal.

**2. One request per keystroke**

- **Where:** `App.tsx:64` (search input) and `useAssets.ts:45` (effect re-runs on every query change)
- **Problem:** Each character typed sends a new search immediately. There's no pause to wait for typing to stop, which wastes requests against the rate limit.
- **Seen:** typing "garden" sent 6 requests.
- **Status:** fixed (Task 1). Search debounced by 400 ms.

**3. Filters and search are lost on reload and can't be shared**

- **Where:** `App.tsx`
- **Problem:** Search, status and sort live only in memory, not in the URL, so a reload loses them. There are no controls for kind or tag, even though the API supports both.
- **Seen:** searched "garden", ticked Approved, changed sort, reloaded; everything reset and the address bar never changed.
- **Status:** fixed (Task 1). Filters stored in the URL (replaceState for typing, pushState for clicks). Kind filter added; tag has no picker UI yet.

**4. Only the first 24 assets can ever be shown**

- **Where:** `useAssets.ts:33` (nextCursor stored, never read); `App.tsx:26` (limit: 24)
- **Problem:** The server returns a cursor for the next page, but the app never uses it.
- **Seen:** the count always says "24 of 12,400 shown" and scrolling loads nothing more.
- **Status:** fixed (Task 2). useInfiniteQuery with cursor pagination, 50 per page, next page loads near the bottom, duplicates dropped, a failed page shows "Couldn't load more · Try again" and keeps the loaded cards.

**5. Loading, empty and error look the same, and errors keep old results**

- **Where:** `AssetGrid.tsx:18–25`; `useAssets.ts:19` and `:39–43`
- **Problem:** The list starts empty, so while loading the grid says "Nothing matches these filters." When a request fails, the previous search's cards stay on screen under the error, looking like current results.
- **Seen:** "summer" returned 503 and the page showed "503: Search index is warming up." above the older search's cards.
- **Status:** fixed (Task 1). Separate skeleton, updating, empty and error states; errors replace old cards.

**6. Every loaded card is put into the page**

- **Where:** `AssetGrid.tsx:29–55`
- **Problem:** Every asset becomes DOM elements, including cards far off screen, so the page grows with the list. It's hidden today only because defect 4 limits the list to 24.
- **Seen:** with 24 cards temporarily repeated to 5,000, the page had 35,041 elements (199 at 24 cards).
- **Status:** fixed (Task 2). rows virtualized with TanStack Virtual; only rows near the screen are rendered.

**7. Cards collapse into thin lines once many rows load**

- **Where:** `styles.css` - `.grid` (fixed height) and `.card` (overflow: hidden)
- **Seen:** with 5,000 cards every card became a thin line
- **Status:** fixed (Task 1). `grid-auto-rows: max-content` on `.grid`, so rows size to their cards instead of shrinking to fit the grid's height. virtualized rows now have a fixed calculated height, so cards can't collapse; checked at 2,000 rows.

**8. Ticking one checkbox redraws every card**

- **Where:** `App.tsx` - toggleSelect (new Set on every toggle); read by every card at `AssetGrid.tsx` - `checked={selectedIds.has(asset.id)}`
- **Problem:** Selection is one object passed to the whole grid, so changing one checkbox makes React rebuild every card, not just the one that changed.
- **Seen:** React DevTools Profiler, one click re-rendered App and AssetGrid. 4.9 ms at 24 cards, 141.7 ms at 5,000 (dev mode).
- **Status:** fixed (Task 2). The card is its own `AssetCard` component wrapped in `memo`, and gets `isSelected` / `isActive` as true/false instead of the whole selection, so ticking one card only changes that card's props. `toggleSelect` uses `useCallback` so the function passed to every card stays the same. Checked in the React DevTools Profiler: other cards show "Did not render".

**9. Thumbnails ignore hasThumbnail and all load at once**

- **Where:** `AssetGrid.tsx`
- **Problem:** The app requests a thumbnail even when the asset says none exists, so those return 404 and show the browser's broken-image icon. There's no loading="lazy", so every thumbnail downloads even when off screen.
- **Seen:** some cards show a broken-image icon instead of a thumbnail.
- **Status:** fixed (Task 2). New Thumbnail component: no request when hasThumbnail is false, same-size placeholder showing the kind, loading="lazy", and onError falls back to the placeholder. Checked: 0 thumbnail 404s and no broken images.

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

- Replaced the `useState` + `useEffect` loader with React Query. Task 1 used `useQuery`; Task 2 switched to `useInfiniteQuery`, so each search keeps its own list of pages and cursors.
- It gives a cache per search, request cancellation and de-duplication, which the brief asks for, so I didn't have to build and test them myself.
- React Query's automatic retry is off. Retries come in Task 4, where I can choose which errors are safe to retry.

**Stale response handling**

- The query key is the search filters, so each response is stored under the search it was for. A slow old response can't show up under a newer search.
- Superseded requests are cancelled, not just ignored: I pass React Query's `signal` to `fetch`.
- Before building the key, I trim the text and sort the status/kind/tag lists, so "Draft + Approved" and "Approved + Draft" are the same search and send one request.
- Search is debounced by 400 ms: it runs when typing pauses, not on every letter. Filter and sort clicks apply immediately. 400 ms waits for a real pause at a normal typing pace but still feels instant.
- Pagination can't reuse an old cursor: loading more is blocked while the previous search's cards are still on screen, so an old cursor is never sent with new filters and the user never sees `stale_cursor`. Checked by changing a filter mid-scroll: the first request had no cursor and nothing returned 400.

**Virtualization approach**

- TanStack Virtual renders only the rows near the screen (plus 2 above and below); the rest is empty space of the right height. Checked: see Performance (DOM nodes at 5,000 rows).
- Columns come from the grid's width (a `ResizeObserver`), using the same 220px minimum as the CSS.
- Row height is calculated, not measured: 16:10 thumbnail + 104px card body + 12px gap. Every row is the same height, so nothing jumps while scrolling. Cost: card names and details are one line with "…".
- No layout shift as pages load: while more pages exist, one row of placeholder cards is reserved at the bottom and the next page fills it. Measured with a `PerformanceObserver` for `layout-shift` in Chrome (production build): score 0 on first load and 0 while loading 1,000 more assets (one run).
- A new search remounts the grid, so it starts at the top.
- Opening or closing the detail panel changes the column count, so every card moves. The grid remembers the first card of the top row and scrolls it back to the top. Checked with three open/close round-trips: the top row came back identical each time. Selection never remounts the grid, so its scroll position isn't touched.
- Rejected: hand-written virtualization. Possible, but more scroll maths to own and test; the library costs +8 kB gzipped.
- Rejected: measuring each row's real height. Simpler to write, but rows and the scrollbar shift as heights are measured.

**Optimistic updates and rollback**

**Retry and backoff policy**

**State placement and URL sync**

- Search and filters (`q`, `status`, `kind`, `tag`, `sort`) live in the URL, so reload, shared links and Back restore the same view.
- Typing uses `replaceState` (no history entry per letter). Filter and sort clicks use `pushState`, so Back undoes one click.
- Unknown values in an edited link are ignored instead of breaking the page.
- Rejected: React Router. One page doesn't need a router just to read query parameters.
- Added Kind checkboxes. Tag works through the URL but has no picker yet.

---

## Performance

Fill in real measurements, not estimates. Say which machine and browser.

**Machine:** MacBook Air M1, 8 GB RAM, macOS 14.5 · **Browser:** Chrome 153.0.8010.36 (arm64) · Mock API with chaos and latency on.

| Metric                                          | Before                                                       | After                                                                                                                                                               | How measured                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendered DOM nodes at 5,000 rows loaded         | 35,041                                                       | 259 (top) / 345 (middle) / 388 (bottom)                                                                                                                             | `document.querySelectorAll('*').length`. Before: the 24 baseline cards temporarily repeated to 5,000 (the baseline can't load more than 24). After: 5,050 real rows loaded by scrolling, full-width window (6 columns), counted at the top, middle and bottom of the list. The count depends on window size, not on how many rows are loaded.                                               |
| Cards re-rendered when toggling one selection   | Every card (24 of 24); 4.9 ms at 24 cards, 141.7 ms at 5,000 | 1 (only the ticked card, of 48 on screen with 5,000 loaded); 3–5 ms per click                                                                                       | Dev mode, React DevTools Profiler. After: 5,000 rows loaded; only the ticked card rendered, all others "Did not render".                                                                                                                                                                                                                                                                    |
| Longest task during sustained scroll            | Not measured (the baseline can't load 5,000 rows)            | Fast scroll (3,000 px/s): 0, 0 and 1 long task in three runs, longest 76 ms; p95 frame 17 ms. Stress (whole list in 5 s, ~43,000 px/s): 3 long tasks, longest 85 ms | Production build (`vite preview`), 5,050 rows loaded, React DevTools highlights off. Scripted 10 s scroll driven by `requestAnimationFrame`, with a `PerformanceObserver` logging tasks over 50 ms. Some runs also had single frame gaps of 0.45–2.2 s with no long task; I haven't found the cause, so those aren't counted as app work.                                                   |
| Requests fired while typing a 6-character query | 6 (one per keystroke)                                        | 1                                                                                                                                                                   | Network tab filtered to `api/assets`, cleared, typed "garden" at normal speed.                                                                                                                                                                                                                                                                                                              |
| Production bundle, gzipped                      | 48.30 kB JS (49.75 kB with CSS + HTML)                       | 69.33 kB JS (71.05 kB with CSS + HTML), +21 kB                                                                                                                      | Gzip sizes printed by `npm run build`, recorded after each step: React Query ≈ +11.4 kB (cache, cancellation, de-duplication, cursor pagination), TanStack Virtual ≈ +8.0 kB (virtualized grid), my own code ≈ +1.6 kB. Justification: the two libraries replace the hardest parts of Tasks 1–2 (request identity and cancellation, bounded DOM) with tested code I don't have to maintain. |

**What was the actual bottleneck, and how did you find it?**

The baseline hid its own bottleneck: without pagination it only ever showed 24 cards, so nothing looked slow. To see the real cost, I temporarily repeated those 24 cards to 5,000 in `AssetGrid.tsx` and measured.

- **The biggest cost I measured was re-rendering.** In the React DevTools Profiler, ticking one checkbox re-rendered `App` and `AssetGrid`, which rebuilt every card: 4.9 ms at 24 cards and **141.7 ms at 5,000** (dev mode), far over the 16 ms frame budget, for a change to one card. The cause was the whole `selectedIds` set being passed to every card.
- **The second cost was DOM size.** Every loaded card was in the page: **35,041 elements** at 5,000 cards, counted with `document.querySelectorAll('*').length`. Measuring this also exposed a CSS bug: with that many rows, the cards collapsed into thin lines.

**What I changed:** memoized `AssetCard` with true/false props and a stable `useCallback`, so one tick re-renders **1 card**; and virtualized rows with TanStack Virtual, so the page holds **259–388 elements** however far you scroll.

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
  - **Loading (first load):** grey skeleton cards in the real grid layout, so nothing jumps when results arrive.
  - **Updating:** while a new search loads, the previous cards stay dimmed with an "Updating results…" label.
  - **Empty:** "Nothing matches these filters." only for a real empty answer, with a button to clear search and filters.
  - **Error:** "Couldn't load assets." with Try again; the error replaces the old cards instead of sitting above them.
  - **Loading the next page:** one row of placeholder cards is reserved at the bottom, so new cards fill space that's already there.
  - **Next page failed:** "Couldn't load more · Try again" under the cards; the cards already loaded stay.
  - **Missing thumbnail:** a same-size grey box showing the kind (Image, Video, Document) instead of a broken-image icon.
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
