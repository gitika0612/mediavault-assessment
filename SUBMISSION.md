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
| 10  | Bulk update fails completely above 50 items                         | `App.tsx`                                          | Fixed (Task 3)              |
| 11  | Partial failures can't be seen or recovered                         | `App.tsx`                                          | Fixed (Task 3)              |
| 12  | The grid doesn't show the changes you make                          | `App.tsx`                                          | Fixed (Task 3)              |
| 13  | Errors are plain text, and nothing retries                          | `client.ts`, `App.tsx`                             | Fixed (Task 4)              |
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
- **Status:** fixed (Task 3). Selection split into groups of 50 and sent with at most 3 requests in flight (bulk.ts); each 207 is split into successes and failures with reasons. Checked with 200 selected: 4 requests, max 3 at once, no 400.

**11. Partial failures can't be seen or recovered**

- **Where:** `App.tsx`
- **Problem:** After a bulk update the app shows only a count ("19 updated, 5 failed"), not which assets failed or why, even though the server returns that per asset. It then clears the selection, so the failed ones can't be retried.
- **Seen:** "19 updated, 5 failed" and "20 updated, 4 failed", with the selection cleared both times.
- **Status:** fixed (Task 3). The result is one line in the bulk bar: how many changed, then each reason with a count ("20 on legal hold · 1 changed at the same time"); Details lists the assets by name. Failures stay selected, and Retry covers only the reasons that can succeed — legal hold and not found get no retry button.

**12. The grid doesn't show the changes you make**

- **Where:** `App.tsx` (handleSaved is empty)
- **Problem:** Changing a status, from the detail panel or in bulk, doesn't update the cards. The grid keeps showing old statuses until you search again or reload.
- **Seen:** approved a Draft asset in the panel; the panel said Approved but the card still said Draft.
- **Status:** fixed (Task 3). Both bulk actions and panel saves write the updated asset into React Query's cached pages (`cache.ts`), so the cards change without refetching the list. Successes take the server's asset, which carries the new version.

**13. Errors are plain text, and nothing retries**

- **Where:** `client.ts` and `App.tsx`
- **Problem:** Every failure becomes a "<status>: <message>" string, so code can only tell errors apart by matching text, and users see it as-is. There's no retry, no waiting when the server says to, and no way to cancel a request.
- **Seen:** a search returned 503 and the page showed "503: Search index is warming up." with no retry in the Network tab.
- **Status:** fixed (Task 4). Failures now carry a kind (http / network / offline), a status and the server's code (`errors.ts`), so code branches on those instead of reading text. Transient failures are retried with backoff and jitter (`retry.ts`), and `userMessage.ts` turns every error into plain words. Checked: a real 503 during a search now goes 503 → 200 with nothing shown to the user; a rate limit gives 3 attempts about 3 s apart, then "MediaVault is busy right now. Wait a moment and try again."

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

**Selection model**

- A plain click on a card opens it: in a library the usual action is "look at this one". The checkbox selects, and shift-click extends from the last card clicked, in the order the cards appear.
- "Select all loaded" says **loaded** on purpose. The bulk endpoint takes ids, not a search, so selecting "all 3,000 matching" would mean paging the whole result set just to collect ids.
- Changing the search clears the selection, so a bulk action can never hit assets that are no longer on screen.
- Selecting is one state update and cards are memoized, so it doesn't slow down: 600 selected at once took 0.4 ms of React work and 7 ms to the next frame.

**Optimistic updates and rollback**

- Single edits in the detail panel are deliberately **not** optimistic: the buttons show "Saving…" instead. One asset is cheap to wait for, and it keeps the conflict flow below easy to follow.
- Clicking a status writes it into React Query's cached pages straight away, so the cards change before the server answers (measured at 14 ms for 50 assets). The list is never refetched afterwards: deep in a list that would reload every loaded page.
- Before sending, each asset's current status is remembered. When the answer comes back, successes are replaced with the server's asset (new version included) and **only the failures** are put back.
- Requests are split into groups of 50 (the server's cap) with at most 3 in flight. Checked with 200 selected: 4 requests, never more than 3 at once, no `400 too_many_ids`.
- A whole request that fails (rate limit, network) marks its ids as failed rather than losing them, so they are retryable like any other failure.
- Failures are grouped by reason and named. Retry sends only the reasons that can succeed: `conflict` and failed requests. `legal_hold` and `not_found` never get a retry button, because retrying them would be a promise the API can't keep.
- Assets we just changed that no longer match the status filter stay where they are, marked "No longer matches this filter". Removing rows would jump the scroll and make rolling back a failure harder.

**Conflict handling (409)**

- The detail panel saves with the version it loaded. On `409` it fetches the current asset, shows it, and asks: "This asset changed since you opened it — it's now X. Apply your change again?" with **Apply** and **Keep current**.
- Rejected: retrying automatically with the fresh version. That is last-write-wins, and in an approval workflow it silently discards someone else's decision.
- Rejected: failing with an error and making the user reopen the asset. The API doesn't say what changed, so most conflicts are harmless (a rename, say) and that would punish the common case.
- One click is the price: it takes a second, and it makes overwriting someone else's change deliberate rather than accidental.
- Bulk actions can't use this flow: the bulk endpoint takes no versions, so it is last-write-wins by design. Its `conflict` results are reported and offered as a retry instead.

**Retry and backoff policy**

- Whether to retry is decided from the error's **kind and status**, never its text: offline no, network yes, and for http only 429, 500, 502, 503 and 504. So 400, 409 and 422 can't be retried by accident.
- **Waits:** when the server sends `Retry-After` (3 s on 429, 2 s on 503) that is a **floor**, plus up to 500 ms of jitter. Otherwise it backs off (300 ms, 600 ms, capped at 4 s) and waits a random part of that, so requests that failed together don't retry together.
- **Attempts are capped** and differ by cost: 3 for searches and single assets, 2 for bulk chunks (a 50-id request is expensive to repeat, and per-asset conflicts already come back as retryable failures).
- **Saves retry only the server's `write_failed`.** The mock rolls that failure *before* applying the change, so repeating it is safe. A dropped connection isn't: the change may already have landed, so it isn't retried.
- **A cancelled request stops waiting** instead of firing its retry later, so an abandoned search doesn't spend rate-limit budget.
- **Retries live in one place** (`withRetry`), and React Query's own retry stays off. One policy to reason about, and it also covers the calls React Query never sees, like bulk chunks.
- Measured: `Retry-After: 3 s` produced waits of 3.26 / 3.34 / 3.28 s; a real 503 during a search recovered as 503 → 200 with nothing shown to the user; a rate-limited search made exactly 3 attempts (0.4 s, 3.5 s, 6.7 s) and then stopped.

**Offline**

- `navigator.onLine` plus the browser's online/offline events. While offline, requests aren't sent at all: they fail in about 1 ms as an "offline" error, which is never retryable.
- The user is told twice: a banner ("You're offline. Nothing can load or save until you reconnect.") and, over the dimmed grid, "Waiting for a connection…". Bulk and panel status buttons are disabled.
- React Query holds queries back while offline rather than failing them, which left the previous search's cards on screen looking current. The "Waiting for a connection…" label exists because of that.
- On reconnect, only queries that are in error are refetched — refetching everything would reload every loaded page.
- **Not done: queueing writes made while offline.** The brief calls it a bonus. An approval that silently lands ten minutes later, after the reviewer has moved on, is worse than refusing it now.

**Error boundary**

- Two boundaries, one around the grid and one around the detail panel, so a crash in one leaves the other usable. Each shows "… stopped working. The rest of the page still works." with Try again, which remounts that part.
- Checked by making cards throw: the grid was replaced, the panel, search, filters and bulk bar kept working, and Try again brought all 20 cards back. Same test for the panel.

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

I optimised for scanning rather than for first impression: a reviewer spends the
day moving through hundreds of near-identical cards, so the interface's job is to
make name, status and selection readable at a glance and keep everything else
quiet. One accent colour is reserved for selection and focus, a single grey ramp
carries all the structure, and the remaining colours only appear as outcomes — in
review, approved, failed — so colour still means something when you see it. Every
state the app can be in uses the same shape: what happened, a quieter line of
detail, then the way out. I spent the time on consistency and on the states rather
than on decoration, because that's what stops an app feeling unfinished on the
tenth screen.

- **Visual system.** Everything lives in one `:root` block at the top of
  `src/styles.css` — about thirty tokens, and no file sets a colour or font size
  inline. Two surfaces and **three** line weights: `--border` for card edges and
  dividers (decorative), `--border-strong` for quiet emphasis, `--border-control`
  for anything you can click. Spacing is a 4px step scale (`--space-1…6`), type is
  six sizes and two weights (`--size-xs…lg`, `--weight-normal/strong`), and there
  are three radii. The deliberate decision is the three line weights: a card edge
  and a button edge are different jobs, and only the second one has a contrast
  requirement to meet.
- **Status treatment.** The four statuses are a pipeline, so they're drawn as one
  dot filling up: draft is an empty ring, in review is half filled, approved is
  solid, archived is solid but faded back. Colour follows the same order — grey,
  amber, green, greyed out — but the fill carries the meaning on its own, so the
  four stay apart in greyscale or for anyone who can't separate red from green.
  The same dot appears everywhere the status does: on the card pill, in the filter
  checkboxes and on the detail panel's status buttons, always next to its label.
  Nothing in the app is colour-only or icon-only.
- **States.** What you did with loading, empty, error, offline and partial
  failure.
  - **Loading (first load):** grey skeleton cards in the real grid layout, so nothing jumps when results arrive.
  - **Updating:** while a new search loads, the previous cards stay dimmed with an "Updating results…" label.
  - **Empty:** "Nothing matches these filters." only for a real empty answer, with a button to clear search and filters.
  - **Error:** "Couldn't load assets." with Try again; the error replaces the old cards instead of sitting above them.
  - **Loading the next page:** one row of placeholder cards is reserved at the bottom, so new cards fill space that's already there.
  - **Next page failed:** "Couldn't load more · Try again" under the cards; the cards already loaded stay.
  - **Missing thumbnail:** a same-size grey box showing the kind (Image, Video, Document) instead of a broken-image icon.
  - **Offline:** a banner at the top, and "Waiting for a connection…" over the dimmed grid; actions that would fail are disabled.
  - **Partial failure (bulk):** one line in the bulk bar — "408 of 500 approved · 62 on legal hold · 30 changed at the same time" — with Retry for the ones that can succeed, and Details for the names.
  - **A crash:** the grid or the panel is replaced by "… stopped working. The rest of the page still works." with Try again; the rest of the page keeps working.
- **Contrast.** Measured with the WCAG formula against the actual token values,
  not estimated by eye. Body text is 16.9:1, muted text 5.7:1 on white and 5.3:1
  on the sunken filter bar, the accent 5.6:1, error text 6.9:1 on white and 6.1:1
  on its own tint — all clear of AA's 4.5:1. The failure it caught was control
  borders: the decorative `--border` at 1.37:1 was also being used on buttons and
  inputs, well under the 3:1 non-text rule, so `--border-control` (#868e9c —
  3.30:1 on white, 3.05:1 on the sunken bar) was added for controls and the light
  border kept for edges that carry no information.
- **Copy.** Any user-facing message you rewrote and why.
  - Every error passes through one function (`userMessage.ts`), so no status codes or server phrasing reach the screen. "429: Too many requests in the last 10 seconds." became "MediaVault is busy right now. Wait a moment and try again."
  - Each message says what to do next: "Search is briefly unavailable. Try again in a moment.", "That change didn't save. Try again.", "On legal hold — this asset can't be archived.", "Names need at least 3 characters."
  - Mistakes the app makes (`stale_cursor`, `too_many_ids`, `bad_cursor`, `bad_request`) never show their code: the user reads "Something went wrong on our side. Try reloading the page." and the code goes to the console, for me rather than them.
  - Counts say "loaded", not "shown": with virtualization only a few cards exist at a time, so "5,050 of 12,400 loaded" is the honest wording.

**Screenshots**

- [grid.png](docs/screenshots/grid.png) — a search with two status filters on and
  three cards selected: name, status pill and selection state are all readable
  while scanning.
- [bulk-result.png](docs/screenshots/bulk-result.png) — 50 assets sent to
  Archived: "24 of 50 archived · 23 on legal hold · 3 changed at the same time".
  Retry covers only the 3 that can succeed; the 23 on legal hold never can.
- [bulk-result-2.png](docs/screenshots/bulk-result-2.png) — the same result with
  Details open, naming every asset under each reason.
- [color-blind.png](docs/screenshots/color-blind.png) — the first view under
  Chrome's Achromatopsia emulation. With every colour gone, the dots still
  separate In review (half filled) from Approved (solid), and the ticked
  checkboxes still read as selected.

---

## Trade-offs and cuts

What you deliberately did not do, and what you would do with another day.

- **Writes made while offline aren't queued.** Buttons are disabled instead. An approval that silently lands ten minutes later, after the reviewer has moved on, is worse than being told "not now". The brief calls queueing a bonus.
- **Undo after a bulk action.** The brief allows retry *or* undo; retry is the half that distinguishes a legal-hold failure (never succeeds) from a random conflict (usually does). Undo would need a second bulk run grouped by each asset's previous status.
- **A loaded list is never refreshed on its own.** Going back to a search shows what was cached. Refetching would reload every loaded page at once, which the rate limit can't take.
- **Tag filtering works through the URL but has no picker.**
- **Card names and details are cut to one line**, so every row is the same height and scrolling stays smooth.
- **"Select all loaded" means loaded, not all matching.** The bulk endpoint takes ids, so selecting "all 3,000 matching" would mean paging the entire result set first.
- **After a retry, permanent failures drop out of the result line.** The line always describes the last action.

## Critique of the API

What you would change about the backend contract, and what it forced you to do in
the client that you would rather not have.

## Anything you would like us to look at

Code you are proud of, or a decision you are unsure about and want to discuss.
