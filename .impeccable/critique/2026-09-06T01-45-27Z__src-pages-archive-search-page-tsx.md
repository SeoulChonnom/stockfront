---
target: 아카이브 화면 (archive search)
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-06T01-45-27Z
slug: src-pages-archive-search-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton/RefetchBadge/live-announce/arrival-flash all present and `role="alert"` verified on error, but draft-vs-applied divergence rests on one small badge while two different date ranges sit on screen at similar weight. |
| 2 | Match System / Real World | 3 | Zero enum leakage verified at `role:'user'`; but `<input type="date">` still renders `MM/DD/YYYY` against ISO everywhere else — narrated by a hint line, not resolved. |
| 3 | User Control and Freedom | 4 | Per-chip removal, 초기화 vs 전체 해제, out-of-range self-heal, and both Esc paths on the mobile inline panel verified working. |
| 4 | Consistency and Standards | 3 | Date-format split; `필터` and `검색 결과` are both `<h2>` styled at opposite extremes; the form-drafts / results-navigate rule is coherent but nowhere taught. |
| 5 | Error Prevention | 4 | Pre-submit date validation, theme cap, page clamp, and the keyword length rule now shown before submission rather than after. |
| 6 | Recognition Rather Than Recall | 4 | URL carries full state; chips are the single applied-filter source; weekday in the date cell; month headers; ISO hints under the date fields. |
| 7 | Flexibility and Efficiency | 4 | Presets, month-header narrowing, Enter-to-submit (verified), deep-linkable URLs, and 20 tab stops for 20 rows (was 40). No apply shortcut or jump-to-date. |
| 8 | Aesthetic and Minimalist Design | 3 | 4 presets + 6 fields visible at once on desktop; deliberately dense. Empty state and post-error card are now clean. |
| 9 | Error Recovery | 4 | Plain-language error + retry, codes audience-gated, and the out-of-range page gets its own honest copy plus a one-click fix. |
| 10 | Help and Documentation | 2 | Only the theme popover carries inline help; nothing explains the draft→apply model, and nothing says what `부분 생성` means for trusting that day's data. |
| **Total** | | **34/40** | **Good — address the weak areas, solid foundation** |

## Design Specificity Verdict

**Authored for this product.** Four things a generic admin table would never do: KST weekday computed by UTC-anchored string slicing so "지난 금요일" is correct at midnight boundaries; month-group headers that are now the range control; a subtitle that makes a testable promise ("결과를 열고 돌아오면 필터와 위치가 그대로 복원됩니다") which the code actually keeps via URL round-trip plus saved scroll; and audience gating threaded consistently through `pageId`, partial-failure reasons, and raw error codes.

The filter form itself remains a shared generic primitive — correctly so, since the product-specific work is layered on top.

**Deterministic scan**: `detect.mjs --json` returned `[]` (exit 0) on both `src/pages/archive-search-page.tsx` and `src/pages/archive-search/`. `pnpm contrast` PASS. `tsc` 0, `biome check src` clean, vitest **707 passed**, `shadcn:drift` 0 across 20 components, `knip` clean in every feature file (findings confined to shadcn registry exports and two pre-existing types). Browser: no horizontal overflow at 320/390/1440 or at 200% root font; 0 unnamed interactive elements; heading order `H1 아카이브 → H2 필터 → H2 검색 결과`; 0 elements animating under `prefers-reduced-motion`; status badges carry text plus a dot at 5.35:1/5.37:1 light and 7.50:1/9.41:1 dark.

**Two Assessment-B findings were wrong and are corrected here**, both re-measured directly: (a) B reported the 5xx state leaves a stale `결과를 불러오는 중입니다` in a live region and fires no error announcement — measured, `role="alert"` carries the full error text and the stale string count is **0**; (b) B reported `pageId` is gated on `status !== 'READY'` — it is gated on `canViewOps` alone (`archive-results-table.tsx:270`), and renders 20 times on a page of READY rows.

## Overall Impression

The screen now tells the truth. Every place it previously misstated something — a reversed `21–4 / 4` range, a "no results" message over 4 results, `READY`/`PARTIAL` in a retail user's dropdown, `시장 KR` beside `한국 (KR)` — is gone, and the fixes are structural rather than patched: the result range is derived from the rows actually returned, so a reversed range is now unrepresentable.

What is left is not correctness but **teaching**. The screen has two legitimate interaction rules and signposts neither, and its landing state matches none of the four shortcuts it offers. The biggest remaining opportunity is making the model self-evident rather than discoverable by surprise.

## What's Working

1. **Truthfulness by construction.** The result range is computed from `rows.length` rather than `page × PAGE_SIZE`, so the old reversed range cannot recur; an out-of-range page self-heals via `replace` navigation (verified: `?page=9` → `page=3`, header `41–46 / 46`) instead of explaining an error.
2. **Audience gating that holds under measurement.** At `role:'user'`, `pageId`, pipeline reasons, and raw error codes all vanish; zero raw enums (`READY`/`PARTIAL`/`시장 KR`) appear anywhere in rendered text at either role. Verified live, not read from source.
3. **Equivalent feedback across input methods.** Every filter, chip, page, and month action pairs a visual arrival flash with focus movement and a live-region announcement; the mobile theme picker drops the overlay entirely and both Esc paths return focus to the trigger. Sighted, keyboard, and screen-reader users get the same confirmation.

## Priority Issues

### [P1] The default range matches no preset — and the number 14 is written twice
- **What**: `getRelativeIso(14)` is hardcoded independently in `src/lib/app-state.ts:119` (URL parser fallback) and `src/pages/archive-search/filter-copy.ts:96` (`getDefaultArchiveFilters`). `matchArchiveRangePreset` never matches 14 days, so all four presets render `aria-pressed="false"` on landing (measured).
- **Why it matters**: two facets. For the user, the most common entry point shows a shortcut row that appears disconnected from the state being displayed. For the codebase, changing one constant and not the other silently desynchronizes `초기화` from a bare URL — the same drift class already unified for the theme cap, missed here.
- **Fix**: hoist the default span to one exported constant (`lib` owns it, as with `MAX_ARCHIVE_THEME_SELECTIONS`), then either add a `지난 14일` preset or move the default onto an existing one so the landing state is always a named shortcut.
- **Command**: `$impeccable harden`

### [P2] Two commit rules on one screen, neither taught
- **What**: controls in the filter card edit a draft and wait for `필터 적용` (presets included); controls in the results area — chips, pager, month header — navigate immediately.
- **Why it matters**: the rule is coherent and predates the presets (chips always navigated immediately), but nothing on screen expresses it. A user who learns "nothing happens until 필터 적용" from a preset has no way to know the month header commits on click except by clicking it.
- **Fix**: make the boundary legible rather than removing it — the filter card already carries a dirty badge; give the results-area controls a shared visual cue that they act immediately, or state it once in the card. Applying presets immediately is the alternative, but it breaks the dirty badge whenever another field is mid-edit.
- **Command**: `$impeccable shape`

### [P2] Single-line result links are 39px on touch — the screen's primary action
- **What**: `.tap-target-text` uses `padding-block: 11px` under a coarse pointer, which lands single-line row links at **177×39** (measured). Multi-line rows clear 44px incidentally.
- **Why it matters**: opening a day's brief is the whole point of this screen, and the rows most likely to be single-line are the failure rows (`헤드라인이 생성되지 않았습니다`) — exactly what a retrospective user is hunting.
- **Fix**: raise `.tap-target-text`'s coarse-pointer padding so a single line clears 44px, or give the row link a coarse-pointer `min-height` on a non-inline display. Note `min-height` is inert on `display: inline`, which is why the padding approach exists.
- **Command**: `$impeccable adapt`

### [P2] `생성 상태` cannot select 실패, though FAILED rows are shown
- **What**: `ARCHIVE_SEARCH_STATUSES` and the query type allow only `READY`/`PARTIAL`, while rows render `FAILED`.
- **Why it matters**: the product's stated rule is to reveal what is missing, and "지난달에 브리프가 깨진 날" is a natural retrospective query the screen displays but cannot filter for.
- **Fix**: backend-bounded — the API must accept `FAILED` as a filterable status. Raise it as an API request rather than working around it client-side, since a client-side filter would only cover the current page.
- **Command**: (none — API request)

### [P3] The month header gives no at-rest signal that it is a control
- **What**: it renders as plain text with hover-only underline inside a `<th>`; the affordance is legible only on hover or focus.
- **Why it matters**: this is the control built specifically for the researched period-scanning behavior, and it is invisible to a user who does not happen to hover it.
- **Fix**: a small persistent affordance consistent with the page's existing interactive vocabulary.
- **Command**: `$impeccable polish`

## Persona Red Flags

**Alex (power user, 3–5×/week)** — Enter submits, URLs are deep-linkable, presets and month narrowing both exist, and the keyboard cost of a result page halved to 20 stops. Still: the landing range matches none of his four buttons every visit; a preset costs a second click; there is no apply shortcut and no jump-to-date; and he cannot isolate 실패 days.

**Sam (keyboard + screen reader)** — measured clean: 0 unnamed controls, correct heading order, focus ring on every one of 44 tab stops, `role="alert"` announcing errors, live-region announcements on every filter/page/month action, and both Esc paths on the mobile inline panel returning focus to the trigger. Remaining cost: ~19 stops through the filter bar before the first result on every visit, with no skip-to-results.

**Casey (one thumb, 390px)** — no overflow at 390 or 320; filters collapsed by default; the theme picker no longer overlays the form; form controls, pager, and presets all clear 44px on a real coarse pointer. Remaining: single-line row links at 39px (above), and the pager sits far below a long result list.

## Minor Observations

- `필터` and `검색 결과` are both `<h2>` but styled at opposite extremes (small uppercase label vs large semibold) — semantically equal, visually a whisper and a shout.
- `pageId` still renders on every ops row (20 per page), gated on `canViewOps` alone regardless of row status.
- The 테마 field mimics `FilterField` visually but bypasses it for a documented a11y reason — correct today, worth a shared abstraction if a second field ever needs it.
- The ISO hint under each date field narrates the `MM/DD/YYYY` inconsistency rather than removing it; the real fix is a different date control.

## Questions to Consider

1. If the landing range were simply one of the four presets, would the dirty badge, the preset-match logic, and the "which range am I looking at" ambiguity all get smaller at once?
2. The screen has two commit rules that are individually right. Is the answer to teach the boundary, or to notice that "range" is the only thing both rules touch — and make every range gesture behave the same way?
3. The product's own model is READY/PARTIAL/FAILED and its principle is to reveal what is missing. What made FAILED filterable everywhere except the one screen built for finding past days?
4. Five passes moved this from 27 to 34. What would it cost to get the last six points — and is any of it worth more than the next feature?
