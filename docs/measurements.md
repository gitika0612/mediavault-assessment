# Baseline measurements

Measured on the original app before changing any code, so I can compare it
with the final app.

## Setup

- Browser: Chrome 153.0.8010.36 (arm64)
- Machine: MacBook Air M1, 8 GB, macOS 14.5
- Window size: 1440 × 900 (DevTools device toolbar)
- Mock API: `npm run dev:api` (port 8787), chaos on, latency on
- Sections 1–4: production build (`npm run build` + `npm run preview`, port 4173)
- Sections 5–7: dev server (`npm run dev:web`, port 5173), because the React
  Profiler only works in development. DOM counts are the same either way.

## 1. Bundle size

Ran `npm run build` and read the gzip sizes Vite prints.

| File      | Gzip         |
| --------- | ------------ |
| JS        | 48.30 kB     |
| CSS       | 1.17 kB      |
| HTML      | 0.28 kB      |
| **Total** | **49.75 kB** |

The brief's "48 kB" is the JS file.

## 2. Requests while typing "garden"

Network tab filtered to `api/assets`, cleared, then typed "garden" at normal speed.

- Requests: **6**, one per keystroke (g, ga, gar, gard, garde, garden), all 200
- Final result: 24 of 608 shown

**Race condition (seen in the Waterfall):** "gar" (459 ms) finished before
"ga" (883 ms), even though "ga" started first. So the app showed the "gar"
results and then overwrote them with the older "ga" results. "garden"
happened to finish last, so the final screen was correct, but only by luck.

Also noticed: "garde" and "garden" had grey bars (waiting before the request
started), probably because many thumbnail images were loading at the same time.

In earlier tries with other words I also saw random 503 errors. Once, the page
showed the raw text "503: Search index is warming up." above cards from the
previous search, as if they were the current results.

## 3. DOM size at 24 rows

Console: `document.querySelectorAll('*').length`

- Total elements: **199**
- Cards: 24

## 4. Reviewer test (search + bulk approve)

I'll run this exact same test on the final app to compare.

What I did:

1. Restarted the API so the data was fresh.
2. Reloaded the app and waited 10 seconds (the rate limit counts requests in
   the last 10 seconds).
3. Network tab filter: `/api/ -thumb -health` (the server doesn't rate-limit
   thumbnails or health checks), then cleared the list.
4. Typed "garden" in the search box.
5. Ticked all 24 cards.
6. Clicked "Set approved" and waited 5 seconds.

Result:

- Requests: **7** (6 searches = 200, 1 bulk-status = 207 partial success)
- 429 errors: **0** (checked with the filter `status-code:429`)
- Message: "19 updated, 5 failed" (another run: "20 updated, 4 failed").
  The split changes each run because some failures are random, and the message
  doesn't say which assets failed or why.

Why the test is small: the original app can't show more than 24 rows or
bulk-update more than 50 items. A bigger test (scroll 3,000 rows, approve 200)
can only run on the final app.

## 5. Re-renders from ticking one checkbox (24 rows)

React DevTools Profiler: recorded a single checkbox click.

Result: **App and AssetGrid both re-rendered** (1 commit). AssetGrid draws all
24 cards, so the whole grid was redrawn to change one checkbox.

## 6. CSS bug found while testing 5,000 cards

With 5,000 cards, every card collapsed into a thin line instead of a normal
card. The original app never shows this because it only loads 24 rows.
Likely cause (to confirm in `styles.css`): the grid's height and the cards'
overflow settings let the browser shrink each row almost to nothing.
Screenshot saved. Adding this to the defect list.

## 7. DOM size at 5,000 cards

The original app can't load more than 24 cards, so I temporarily repeated the
24 loaded cards to 5,000 in `AssetGrid.tsx`, then removed the change.

Console: `document.querySelectorAll('*').length`

- Total elements: **35,041**
- At 24 cards it was 199

The original app puts every card into the page, even the ones far off screen.

## Scrolling

Not measured on the baseline. I'll measure it on the final app, where the brief
requires no long tasks over 50 ms while scrolling 5,000+ rows.
