---
target: 아카이브 화면 (archive search)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-05T16-35-51Z
slug: src-pages-archive-search-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton/RefetchBadge/live-announce are excellent, but an out-of-range page renders a factually wrong counter (`21–4 / 4`, `2 / 1`). |
| 2 | Match System / Real World | 2 | Raw `READY`/`PARTIAL` enums and `시장 KR` shown to every user; native date inputs render `MM/DD/YYYY` while every other date on screen is ISO. |
| 3 | User Control and Freedom | 4 | Per-chip removal, deliberate `초기화` vs `전체 해제` split, Esc closes the popover and returns focus to the trigger (verified). |
| 4 | Consistency and Standards | 2 | Status/market each rendered two different ways on one screen; two parallel applied-filter summary implementations; project sets `--tap-min: 44px` but its own primary Button/Input are 36px on touch. |
| 5 | Error Prevention | 3 | Date-range and theme-cap validation are solid; no guard clamps `page` to `totalPages`; keyword length rules only surface after a failed submit. |
| 6 | Recognition Rather Than Recall | 4 | URL carries full state; chips echo human labels; weekday sits inside the date cell; month-group headers with counts. |
| 7 | Flexibility and Efficiency | 2 | Enter-to-submit works (verified), but no relative-date presets, no clickable month headers, no saved searches; ~40 tab stops to cross one page of results. |
| 8 | Aesthetic and Minimalist Design | 2 | 6 always-visible filter fields; four separate renderings of "where am I in the results"; theme popover opens with a 3-line implementation note; hollow results card left behind after an error. |
| 9 | Error Recovery | 3 | Plain-language error + retry, raw codes correctly gated to ops (verified at `role: 'user'`); but the out-of-range page shows the wrong diagnosis. |
| 10 | Help and Documentation | 2 | Only the theme popover has inline help, and it explains URL serialization; nothing tells a retail user what `부분 생성` means for trusting that day's numbers. |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Specific where it counts, generic in the chrome.**

The filter card + paginated table shell is the shared `FilterBar`/`FilterField` pattern and could belong to any admin tool. But four decisions are unmistakably authored for *this* product: the weekday fused into the date cell via explicit UTC-midnight parsing to dodge the KST day-shift (`archive-results-table.tsx:34-41`), month-group `<tbody>` headers with per-month counts (`:153-178`), `READY`/`PARTIAL`/`FAILED` promoted to first-class visual states rather than hidden, and row links that carry the entire search context forward so the round-trip promise in the page subtitle is actually keepable (`:76-109`).

Where it goes generic: the six filter fields are undifferentiated selects and inputs, and the one bespoke widget — the theme tree popover — is where complexity most outruns need.

**Deterministic scan**: `detect.mjs --json` returned `[]` (exit 0) on both `src/pages/archive-search-page.tsx` and `src/pages/archive-search/`. Zero findings. `pnpm contrast` → **PASS**, every token pair AA in light and dark. Browser measurement found **zero horizontal overflow** at 1440 / 390 / 320 px and at 200% root font-size; **zero** elements animating above 0.01s under `prefers-reduced-motion: reduce`; **zero** interactive elements with an empty accessible name; heading order `H1 아카이브 → H2 필터 → H2 검색 결과` with no skipped level. This is a genuinely clean automated baseline — the issues below are all judgment- and behavior-level, not lint-level.

## Overall Impression

The accessibility and state-management engineering here is well above average — stale-while-refetch instead of blank-while-refetch, focus-and-scroll on apply, per-action live announcements, audience-gated error codes that I verified actually hold at `role: 'user'`. Someone thought hard about the returning user.

What undercuts it is vocabulary and arithmetic. The screen speaks two languages at once — clean Korean in the results table, raw backend enums in the filter dropdown next to it — and one URL state produces a counter that says `21–4 / 4`. The biggest opportunity is not visual: it is making the screen say one true thing about what the user searched and what they got.

## What's Working

1. **Stale-while-refetch as the default** (`use-last-good-data.ts` + `RefetchBadge`, `archive-search-page.tsx:291,562`). Every search after the first keeps the previous valid table on screen instead of flashing to empty, paired with `focusAndScrollToResults` + `markArrival` (`:322-333`) so a successful apply is unmistakable without being loud. This removes the single most common valley in filter UIs.
2. **Audience gating that actually holds.** At `role: 'user'` the 5xx alert drops its `500 · INTERNAL_ERROR` badge, `pageId` disappears from every row, and pipeline text like "provider 타임아웃" never renders — verified by capture, not just by reading `audience-copy.ts`. Regression-tested at `archive-results-table.test.tsx:44,279`.
3. **Keyboard and motion hygiene.** Esc closes the theme popover and returns focus to its trigger; opening it moves focus into the search field; Enter submits from the keyword field (URL gains `q=반도체&page=1`); nothing animates under reduced-motion. The theme trigger even keeps its accessible name on the button rather than a sibling `<label for>`, with a comment explaining that the naive approach would erase the "N개 선택" state for screen readers (`archive-search-filters.tsx:202-208`).

## Priority Issues

### [P1] An out-of-range page reports a wrong count and the wrong reason
- **What**: `/market/archive/search?...&page=2` on a 4-result query renders `검색 결과 4건 21–4 / 4` in the header (`archive-search-page.tsx:556-557` computes `(page-1)*20+1` – `min(page*20, totalCount)` with no clamp), the pager reads `2 / 1`, and the body shows the generic "조건에 맞는 스냅샷이 없습니다" empty state because `rows.length === 0` is the only branch (`:590`). The copy then blames the filters — "기간을 넓히거나 상태 필터를 해제해 보세요" — when the filters are fine and the page number is the problem.
- **Why it matters**: this is reachable by bookmarking page 2, sharing a URL, or hitting Back after narrowing filters. The user is told their search found nothing when it found 4 results, and is pointed at the wrong fix. `이전` is not disabled, so it is escapable in one click — but only if the user distrusts what the screen just told them.
- **Fix**: clamp `page` to `totalPages` on parse (`app-state.ts`), or branch the empty state on `totalCount > 0 && rows.length === 0` with copy that names the real cause and a "첫 페이지로" action. Also stop rendering `<Pagination>` when `totalCount === 0` — the zero-result state currently shows `이전 [1] 다음 1 / 1`.
- **Suggested command**: `$impeccable harden`

### [P1] Backend enums reach every user, and the same value is named two ways on one screen
- **What**: `filter-copy.ts:16-20` hardcodes `'READY · 준비 완료'` and `'PARTIAL · 부분 생성'` into the 생성 상태 dropdown and, via `getStatusSummaryLabel`, into the applied-filter chip (`archive-filter-chips.tsx:100-105`). Neither path takes an `Audience` prop. The market chip is worse: `시장 ${applied.market}` (`:106-112`) renders `시장 KR` while the select 200px away says `한국 (KR)`. Meanwhile `StatusBadge` in the results table shows Korean only.
- **Why it matters**: PRODUCT.md makes audience-appropriate vocabulary a product rule, and the codebase already honors it for error codes and `pageId`. A retail investor picks `PARTIAL · 부분 생성` from a dropdown, gets a chip saying `PARTIAL · 부분 생성`, and sees `부분 생성` in the table — three renderings, one of which is a database value.
- **Fix**: Korean-only labels in `STATUS_OPTIONS`, matching `StatusBadge`'s existing convention; resolve the market chip through the same label map the select uses (`한국` / `미국`). If ops genuinely need the enum, route it through `errorCodeCopy`-style gating rather than hardcoding it for everyone.
- **Suggested command**: `$impeccable clarify`

### [P1] The date fields render `MM/DD/YYYY` on a screen where every other date is ISO
- **What**: bare `<input type="date">` (`archive-search-filters.tsx`) renders in the *browser* locale, not the document's `lang="ko"` — captured as `08/23/2026` and `09/06/2026` in every screenshot. Directly below, the range chip says `2026-08-23 ~ 2026-09-06` and every table row says `2026-07-26`. The validation message compounds it: "YYYY-MM-DD 형식으로 입력해 주세요" (`filter-copy.ts:56-58`) instructs a format the field does not display.
- **Why it matters**: this is the primary control on a screen whose entire job is picking dates, and `09/06` is genuinely ambiguous to a Korean reader. The user is asked to reconcile two date formats and one instruction that matches neither.
- **Fix**: render the ISO value as visible helper text beside each field, or replace the native input with a date control that displays `YYYY-MM-DD` under `lang="ko"`; at minimum, rewrite the validation copy to match what the field actually shows.
- **Suggested command**: `$impeccable clarify`

### [P1] The default range fights the one task the product says this screen exists for
- **What**: `from` defaults to today − 14 days (`filter-copy.ts:33-42`). There are no relative presets (지난 30일 / 3개월 / 올해), and the month-group headers the table already renders (`archive-results-table.tsx:153-178`) are inert.
- **Why it matters**: PRODUCT.md's success criterion is re-entering an *arbitrary* past brief. Anything older than two weeks starts with manually widening a date field whose format is ambiguous (above), every visit, for a user who comes back 3–5×/week.
- **Fix**: add relative-range buttons beside the date fields and make month-group headers clickable to set the range to that month — the grouping data is already there.
- **Suggested command**: `$impeccable shape`

### [P2] On mobile the theme popover covers the entire form the user just filled in
- **What**: `PopoverContent` has no mobile placement override (`archive-theme-select.tsx:185-189`), so at 390px it opens *upward* and occludes all five sibling fields — 시작일, 종료일, 생성 상태, 시장, 키워드 — with the trigger left below it. Verified in capture. Separately, measured under a real coarse pointer: `필터 적용` 84×36, `초기화` 68×36, `조건 바꾸기` 76×32, date/keyword inputs 324×36, pagination 44×40, theme checkboxes 24×24 — all below the project's own `--tap-min: 44px` (`base.css:94`). The `.tap-target` utility does apply 44px on coarse pointers, but the shadcn `Button`/`Input` primitives never opt into it.
- **Why it matters**: a one-thumb user loses sight of the filters they just set while picking themes, and the primary submit control on the screen is 36px tall on a phone. The project defined the right floor and then didn't route its main controls through it.
- **Fix**: force `side="bottom"` (or a full-width sheet) below the `sm` breakpoint; add `min-h-tap` to the Button/Input variants used in `FilterBar`.
- **Suggested command**: `$impeccable adapt`

## Persona Red Flags

**Alex (power user, 3–5×/week)**: Enter submits from the keyword field — real, verified. URL is fully deep-linkable. But no keyboard shortcuts anywhere on the surface; no relative-date presets, so the same range gets re-entered every visit; month headers are decorative rather than actionable; and traversal is expensive — Chromium spends **8 tab stops crossing the two date fields alone** (segment-by-segment), then every result row costs 2 stops because the date and headline are separate links to the identical href (`archive-results-table.tsx:209,240`). ~40 stops to tab past one page of results.

**Sam (keyboard + screen reader)**: strong, with two gaps. Confirmed working: zero unnamed interactive elements; heading order clean; focus enters the popover on open and returns to the trigger on Esc; theme checkboxes carry full ancestor-path `aria-label`s plus `aria-describedby` (`archive-theme-tree.tsx:57-70`); status is never color-only; contrast AA in both themes. The gaps: every result row announces two links with different names for the same destination, and the theme cap warning (`:155-166`) renders at the bottom of the 300px `overflow-y-auto` container (`archive-theme-select.tsx:82`) — a sighted user who hits the 10-item cap mid-scroll sees the checkbox silently refuse to tick with the explanation off-screen.

**Casey (one thumb, 390px)**: no horizontal overflow at 390 or even 320px — genuinely well handled, and `조건 바꾸기` sensibly collapses the form by default. Against that: the theme popover swallows the form (above); the primary `필터 적용` is 36px tall; with filters open the document runs 3192px, so the pager sits roughly 2700px below the first result with no sticky control and no back-to-top; and for an ops user every row carries a `pageId` line in the most space-starved column.

## Minor Observations

- The theme popover leads with three lines of implementation prose — "…선택한 부모의 하위 테마를 URL에 자동으로 추가하지 않습니다" (`archive-theme-select.tsx:19-20`) — pinned above the search field, never dismissible, describing URL serialization to a retail investor.
- Theme node descriptions frequently restate the label: `기업 이벤트` / "기업 이벤트", `투자자 수급` / "투자자별 수급". They double the vertical cost of the tree for no information.
- Keyword placeholder "정확한 단어를 입력해 주세요" reads like a validation error and implies exact-match semantics that client-side validation (`filter-copy.ts:70-82`, length/word-count only) does not enforce.
- A 5xx leaves a hollow `검색 결과` card below the alert — header and a blank strip, no content.
- Two independent implementations of "what filters are applied": `getAppliedFilterSummary` (plain text, used only in empty-state copy, `archive-search-page.tsx:160-183`) and `ArchiveFilterChips`. Latent drift.
- The `테마 N개 선택` trigger and the theme chips render the same state twice, ~200px apart.
- Zero-result state still renders the pager (`이전 [1] 다음 1 / 1`).

## Questions to Consider

1. The month headers already say "여기서부터 2026년 7월" — why is setting the date range a separate manual act instead of clicking the grouping the table already computed?
2. Three other places in this codebase gate internal vocabulary by audience with tests to prove it. What let `filter-copy.ts` through ungated — and which other copy modules were never audited the way the error and empty-state copy were?
3. If the theme catalog really is ~12 nodes, what would this control look like designed for *that* catalog instead of a generic large taxonomy — and would the mobile occlusion bug and the off-screen cap warning still exist?
4. For someone who returns 3–5×/week for the same shape of lookup, what would it cost to remember their last range as a soft default — and does that fight the deep-linkable-URL model or complete it?
