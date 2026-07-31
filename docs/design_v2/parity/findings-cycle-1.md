# Parity findings — cycle 1

Judged by the main agent from `compare/*.png` (structure) + `style-diff.md` (numbers).
Design prototype = `docs/design_v2/handoff_v2/Market Brief v2.dc.html` is the target.

Two things in the DESIGN captures are prototype-only chrome and must NOT be copied:
the `URL /stock/...` strip above the content, and the rail's `상태 시뮬레이터` button.

Font check: IBM Plex is not installed, both sides fall back to the same system font
(canvas measure delta 0.000px). So every `fontFamily` row in `style-diff.md` is noise —
`fontSize`/`lineHeight` rows are real.

---

## A. Global type scale & vertical rhythm (affects every screen)

| # | What | Design | App |
|---|---|---|---|
| A1 | base font-size on content root | 14px | 16px (browser default, never set) |
| A2 | base line-height | 1.6 (22.4px @14px) | 1.5 |
| A3 | card section heading (`h2`) | 14–15px (필터 14, 검색 결과 14.5, AI 심층 분석 15, 관련 기사 15, 실행 이력 14.5, 상세 14.5) | 17px (`--fs-h2`) everywhere |
| A4 | table body text | 13px / 1.6 → 20.8px | 14px / ~1.43 → 20px |
| A5 | status badge | 12px, padding 4px 9px | 12.5px, padding 2px 8px |
| A6 | cluster `대표 기사` caps label | 12px, uppercase, ls .07em, `--text-faint` | 11px, no uppercase, `--text` |
| A7 | page `h1` line-height | 1.6 (35.2px @22px) | 1.5 (33px) |
| A8 | 404 `h1` | 20px, margin-top 10px | 22px, margin-top 12px |
| A9 | ops `h1` margin-bottom | 4px | 0 |
| A10 | index table line-height | 20.8px | 19.5px |

**Conflict to record:** README §6 states `h2 (섹션) 17px / 600`. The prototype renders those
same headings at 14–15px. This task's instruction is to match the design file, so the
prototype wins — but note the divergence in the decisions log rather than silently changing it.

## B. Spacing

| # | What | Design | App |
|---|---|---|---|
| B1 | `<main>` padding | `var(--pad)` on all 4 sides (32 / 20 / 14 by breakpoint) | 20px vertical, 12px horizontal — not `--pad` |
| B2 | `<main>` layout | `flex; column; gap: var(--gap)` | `block`, no gap |
| B3 | analysis / representative panel padding | 18px | 20px |
| B4 | cluster header card gap | 14px | 16px |
| B5 | ops detail `<dl>` gap | 10px 14px | 8px 16px |
| B6 | list panels (관련 기사, 실행 이력, 검색 결과) | panel padding 0; header and rows carry their own | 20px on the panel |

## C. Component styling

- **C1** Primary button radius is 8px (`--r-md`) in the design; the app renders a pill-ish
  ~14px. Font 13.5px/600 vs the app's inherited size. Verify against
  `compare-regions/ops-batches@1280--trigger-btn.png` before changing — the probe may have
  matched a wrapper.
- **C2** Pagination: design = plain bordered boxes, current page not filled. App = blue
  filled circle. Design also has no `1–20 / N` next to the pager (see D5).
- **C3** Ops attention banner: design = `--surface` white with a 4px `--danger` left border.
  App = `--danger-soft` fill with a full border.
- **C4** Cluster info banner: design = soft blue fill + `i` icon, no heavy left border.
  App = thick blue left border, no icon.
- **C5** Nav rail wordmark `Market Brief`: design `--text`, app `--primary`.
- **C6** Nav rail footer: design has a full-width `다크 테마로 전환` outline button; app has a
  small circular icon button.
- **C7** Cluster tags: design = plain chips, no `#`, `--surface-2` bg + `--line` border.
  App = `#`-prefixed, blue-ish background.
- **C8** Cluster representative actions: design = two inline auto-width buttons side by side.
  App = two stacked full-width buttons.
- **C9** `AI 심층 분석` heading has no icon in the design; the app adds one.
- **C10** Cluster article row: design = 2 lines (title ↗ / `source date [원문] [네이버 미러 ↗]`
  inline). App = 3 lines with the `원문` chip pulled up next to the title.
- **C11** Cluster aside column ≈390px in the design, ≈288px in the app.

## D. Content & formatting

- **D1** Table dates: design `2026-07-26` (ISO, mono). App `2026. 07. 26` (ko-KR locale).
- **D2** Datetimes: design `2026-07-27 06:12 KST`. App `2026. 07. 27. 06:12`.
- **D3** Archive `생성 시각` column: design full datetime; app time-only with seconds
  (`06:08:10`).
- **D4** Archive FAILED row headline: design shows the fallback
  `헤드라인이 생성되지 않았습니다`; the app falls back to `pageTitle`
  (`글로벌 시장 일간 요약 - 2026-07-19`). Fixtures are byte-identical on both sides, so this
  is an app-side fallback bug, not a data artifact.
- **D5** Archive results header: design `검색 결과 46건 1–20 / 46`; app shows only `46건` and
  moved the range down beside the pager.
- **D6** Archive default date range: design `2026-07-13 ~ 2026-07-27` (today−14 … today);
  app `2026-07-12 ~ 2026-07-26` (one day earlier on both ends).
- **D7** Market index table: design shows the ticker code subline (`^GSPC`, `^IXIC`, `KS11`,
  `KRX300`, …); the app drops it although `MarketIndex.code` is mapped.
- **D8** Market section header: design has a `US` / `KR` chip before the market name.
- **D9** Ops summary tiles supporting copy: design `스냅샷 미생성 · 재실행 필요` /
  `일부 지수·요약 누락` / `평균 소요 3분 10초`. App uses different sentences.
- **D10** Ops history `소요` subline: design `2026-07-27 06:10 KST`; app `시작 06:10:00`.
- **D11** Cluster header omits the cluster summary paragraph that the design shows between
  the `h1` and the tags.
- **D12** `관련 기사` heading suffix `관련 기사 8건` missing in the app.
- **D13** Breadcrumb separator: design `/`, app `›`.
- **D14** Cluster header action label: design `해당 날짜 브리프 열기`, app
  `최신 브리프로 돌아가기`.

## E. Structural — product decisions, flagged

- **E1** `/ops/batches` renders a 시작일/종료일/상태 filter form. Neither the design prototype
  nor README §7-6 has one: §7-6.5 specifies the list header as
  `실행 이력` + mono `1–20 / 27` + 적용된 상태 필터 + (필터 있으면) `필터 해제`, with status set
  by the attention banner and the URL. Removing the form keeps the `from`/`to`/`status` URL
  contract intact and only drops a UI affordance. **This is the one reversible product
  decision in this cycle — call it out to the user.**
- **E2** Default selected row in the ops list: design selects the first (newest) row; the app
  selects the first FAILED row, so the two detail panels show different jobs and cannot be
  compared. Align to the design.
