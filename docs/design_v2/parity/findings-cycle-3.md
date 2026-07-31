# Parity findings — cycle 3 (final small deltas)

Cycles 1–2 closed the bulk of the gap. Numeric state at the start of this cycle
(110 probes): `fontSize` 6, `lineHeight` 6, `paddingLeft/Right` 6, `width` 11.
What remains is listed below — all small.

Two of these were confirmed in the source by the main agent, not just inferred from an
image, so they are not phantoms: **O1** and **O4**.

## O — from the composites

- **O1 — `수동 실행` is still top-aligned on `/ops/batches`.**
  `sm:items-end` on the header container is correct, but `batch-header.tsx:34` sets
  `self-start` on the button, and `align-self` beats the container's `align-items`.
  The `self-start` exists for a good reason (it stops the button stretching full-width in
  the stacked mobile layout), so both intents are right — they just collide. Keep
  `self-start` while the header is stacked and release it at the row breakpoint
  (`self-start sm:self-auto` or equivalent). **Re-check the 390 capture afterwards** to
  confirm the button still doesn't stretch.

- **O2 — ops list `소요` column wraps.** The design fits `2026-07-27 06:10 KST` on one line
  under the duration; the app breaks it across two. Same `whitespace-nowrap` treatment the
  counts column already got.

- **O3 — ops detail 실행 로그 header.** The design puts `실행 로그` and the `복사` button on
  one row; the app stacks the button beneath the heading.

- **O4 — E8 landed on only one of two call sites.** `batch-history-list.tsx` correctly reads
  `원문/정제/이슈`, but `batch-detail-panel.tsx:181` still passes
  `label='원문 · 정제 · 이슈'`.

- **O5 — pagination current page.** The design renders it as a plain box; the app fills it
  with a soft accent. Applies to both archive and ops.

- **O6 — ops list column proportions.** The app's 상태 column is wider and 원문/정제/이슈
  narrower than the design's. Content now fits on one line either way, so this is
  proportions only. **Lowest priority — skip it if it fights O2's nowrap fixes.**

## N — still in `style-diff.md`

- **N1 `filter-panel` padding** — design 16px/18px, app 20px at 768 and 1280; at 390 the
  design is 18px and the app 16px.
- **N2 `result-row-status-badge`** — the archive *row* badge is one notch smaller in the
  design than the page-level badge: 11.5px, padding 3px/8px, gap 5px, against the app's
  12px, 4px/9px, 6px.
- **N3 `representative-heading`** — design 12px, `letter-spacing: 0.84px`,
  `margin-bottom: 4px`; app 11px, 0.77px, 0.

## Explicitly NOT to be changed — E6, pipeline stages

The design shows, for the running job 1042: 작업 생성 성공/1초 · 뉴스 수집 성공/1분 36초 ·
지수 수집 성공/12초 · 중복 제거 실행 중. The app shows only stage 1 complete plus
`세부 단계 진행률은 제공되지 않습니다`.

The prototype's fixture **fabricates** per-stage completion and timing that the backend does
not provide — the whole block is tagged `PROPOSED · BACKEND`. This project's standing rule is
to express a missing backend capability as a capability boundary rather than render it as if
it worked. **The app's treatment is correct and stays.**

Record this as a deliberate divergence: a comment at the derivation site, and a line in
`docs/design_v2/v2-decisions.md`, so that the next person reading a parity report does not
"fix" it back.

While in the decisions log, also account for the always-`-` duration column: if a column can
never show a value, either say why it is still rendered (layout parity with the design) or
drop it. Either is defensible; leaving a permanently empty column unexplained is not.
