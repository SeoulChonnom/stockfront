# Parity findings — cycle 2

Cycle 1 closed most of the gap: `fontSize` 87→7 of 110 probes, `lineHeight` 107→7,
`paddingLeft/Right` 28→6. What follows is what is still visibly or numerically different,
judged from the regenerated `compare/*.png` plus `style-diff.md`.

## 0. First — three harness probes are lying, fix them

These three produce large diffs that are **not real**. They matched a wrapper or a
neighbouring node, so they give no signal and hide any real regression underneath. Repoint
them in `scripts/parity/probes.mjs` and re-run before trusting anything they say:

- `result-row-status-badge` — design side resolves to an unstyled text node
  (`display:block`, no padding, `--text-faint`), not the archive row's real status badge.
  Both sides visibly render the same green `● 준비 완료` badge.
- `filter-panel` — app side resolves to an unstyled outer wrapper (`padding:0`, no border,
  `borderColor` = inherited text colour). The app really does render a bordered white card.
- `summary-tiles` — design side resolves to the outer `aria-label="배치 요약"` flex column
  that *contains* the tile grid; the app side resolves to the grid itself.

## A. Real numeric diffs still open

| # | Probe | Design | App |
|---|---|---|---|
| A1 | ops detail `<dl>` text | 12.5px / 20px | 13.5px / 21.6px |
| A2 | `AI 심층 분석` heading spacing | `margin-bottom: 12px` | 0 — parent flex `gap:16px` instead, so the gap is 16px not 12px |
| A3 | 대표 기사 region heading | design's `h2` **is** the `대표 기사` label (12px, uppercase, ls .07em, `--text-faint`) | app's `h2` is the article title; `대표 기사` is a plain `span` |

A3 is not only cosmetic — it changes the aside's accessible name from `대표 기사` to the
article headline. Match the design's heading semantics.

`analysis-panel` / `representative-panel` / `articles-panel` still report
`display: block → flex` + `gap`. **Ignore those**: the design achieves the spacing with
block layout + child margins, the app with flex + gap, and the rendered result now matches.
Means, not ends — do not churn the markup to close them.

## B. Shell

- **B1** Nav rail is missing the wordmark subtitle `일간 시장 브리프 · 운영 콘솔`.
- **B2** Market brief compare strip: the design prefixes each tile with a `US` / `KR` chip
  (`US 미국 증시`). The section headers got these in cycle 1; the top tiles did not.

## C. Market brief

- **C1** Index table column widths differ — the app gives more room to 등락/등락률 and less
  to 고가/저가 than the design. Same total width, different distribution.
- **C2** Index table row pitch ~34px in the app vs ~31px in the design.

## D. Archive search

- **D1** Row pitch ~58px in the app vs ~50px in the design — cell vertical padding is still
  larger. This is the single most visible remaining difference on this screen.
- **D2** `필터` heading and its `적용됨 · … · 전체 상태` summary are on one line in the design;
  the app wraps them onto two.
- **D3** `생성 시각` column is left-aligned in the design, right-aligned in the app.
- **D4** Pagination is left-aligned in the design with `1 / 3` pushed to the right edge; the
  app right-aligns the whole cluster. The design's current page is a plain box; the app
  fills it with a soft accent.
- **D5** The page description paragraph wraps earlier in the design — its measure is
  narrower than the app's.
- **D6** Default date range is still `2026-07-12 ~ 2026-07-26` vs the design's
  `2026-07-13 ~ 2026-07-27`. **Now explicitly in scope** — see the note in the task brief.

## E. Batch operations

- **E1** Page description copy differs. Design:
  `일간 통합 배치의 단계별 진행, 실패 지점, 영향 범위를 확인합니다. 목록과 상세는 독립적으로 조회되며 한쪽이 실패해도 다른 쪽 문맥은 유지됩니다.`
  App uses a different sentence.
- **E2** `수동 실행` sits at the **bottom** of the header block in the design
  (`align-items: flex-end`); the app pins it to the top.
- **E3** List header is missing the applied-filter label — design shows
  `실행 이력  1–20 / 27  · 전체 상태`, app stops at `1–20 / 27`. (README §7-6.5 requires it.)
- **E4** Counts column header is `원문/정제/이슈` in the design, `원문 · 정제 · 이슈` in the
  app — and the app's column is narrow enough that both the header and the values
  (`174 / 114 / 21`) wrap onto two lines. Widen it; the design fits both on one line.
- **E5** Row pitch ~68px in the app vs ~60px in the design.
- **E6** Pipeline stages are derived differently. Design, for the RUNNING job 1042:
  작업 생성 성공/1초 · 뉴스 수집 성공/1분 36초 · 지수 수집 성공/12초 · 중복 제거 실행 중/진행 중 ·
  나머지 4단계 대기/–. App marks nearly every stage 실행 중 and shows no per-stage duration.
  Both sides synthesise this client-side (the block is tagged `PROPOSED · BACKEND`), so this
  is app-side derivation logic, not missing data.
- **E7** Pagination shows a `1 / 2` indicator in the app; the design's ops pager has none.
  (Archive's pager *does* show `1 / 3` — the design is inconsistent between the two screens.
  Follow each screen's own design.)
- **E8** Detail `<dl>` label is `원문/정제/이슈` in the design, `원문 · 정제 · 이슈` in the app.

## F. Cluster detail

- **F1** The `AI 심층 분석` lead paragraph is missing. The design opens the panel with a
  full-width analysis lead (`정책금리 경로에 대한 신중론이 재확인되며 … 반영된 것으로 보입니다.`)
  before the three indented paragraphs. The app renders only the three.
- **F2** Those three paragraphs are indented in the design; the app renders them flush.
- **F3** The header card has a horizontal divider between the tags and the action buttons.
- **F4** `2026-07-26 시장 브리프 보기` carries a calendar icon in the app; the design has none.
- **F5** `관련 기사` heading suffix is `관련 기사 8건` in the design; the app shows `8건`.
- **F6** `네이버 미러 ↗` is a bordered chip in the design's article rows; the app renders it
  as a plain link.
- **F7** The aside column measures ~390px in the design and ~330px in the app.
- **F8** The info banner is taller in the app — more vertical padding than the design.

## G. Out of band — must be fixed, not a design item

- **G1** `e2e/batch-ops.spec.ts:105` clicks `#batch-status-trigger`, which no longer exists
  after cycle 1 removed the ops filter form. The spec is broken and must be updated to the
  new structure, not deleted.
- **G2** `formatTime` and `formatDateTime` in `src/lib/formatters.ts` now have no callers in
  `src/` outside their own tests.
