# Parity findings — cycle 4 (mobile only)

State after cycle 3: every real style property matches on all 110 probes. `fontSize`,
`lineHeight`, `padding*`, `letterSpacing`, `color`, `border*`, `borderRadius` and
`textTransform` are all gone from the offender list. What is left numerically is
`display: block → flex` + `gap` on three panels (`filter-panel`, `articles-panel`,
`representative-panel`) — the design uses block layout with child margins, the app uses flex
with `gap`, and the rendered result is identical. **Those are means, not ends. Do not churn
the markup to close them.**

Desktop (1280/1440) and dark theme were verified visually and match. The remaining real
differences are at **390px only**, all on `/ops/batches`.

## M1 — ops page header wraps differently at 390

Design (`Market Brief v2.dc.html`, the ops header `<section>` — `display:flex;
flex-wrap:wrap; align-items:flex-end; gap:12px`): the description text and the `수동 실행`
button stay on one wrapping row, so the button ends up at the right of the last text line.

App: the header is `flex-col sm:flex-row`, so at 390 the button drops onto its own line below
the description, left-aligned.

Cycle 3 fixed the desktop alignment (`self-start sm:self-auto`); this is the mobile half of
the same header. Whatever you change, **re-check that the button still does not stretch
full-width at 390** — that was the original reason `self-start` was added in cycle 1.

## M2 — ops attention banner wraps differently at 390

Design: the message `3건 실패, 3건 부분 실패 — 확인이 필요합니다.` takes the full width on its
own line, and the `실패만 보기` / `부분 실패만 보기` buttons sit on the line below it.

App: the buttons stay beside the message, squeezing it into three lines
(`3건 실패, 3건 부분` / `실패 — 확인이 필요` / `합니다.`).

## M3 — ops list row height at 390

Design row pitch ≈48px, app ≈55px. Check the row's vertical padding at the mobile step
specifically — the desktop value already matches, so this is likely a breakpoint that steps
down in the design but not in the app.

## Not a code item — a decision for the user, do not act on it

Cycle 3 removed the app's soft-accent fill on the pagination current page, on the correct
observation that the design prototype renders it as a plain box. The root cause found there
is worth recording: the prototype **does** carry a
`[data-nav][data-active="true"]{background:var(--accent-soft);…}` rule (line 71), but every
pagination button also has an inline `style` attribute, and inline styles beat a stylesheet
selector — so the intended active state never paints in the prototype.

That means the app now matches the prototype's *rendered output* while dropping the
prototype's *stated intent*, and the current page is left with no visual indicator at all
(only `aria-current`). Sighted users cannot tell which page they are on.

This is being raised with the user as the one place where pixel parity and usability
disagree. **Do not change the pagination in this cycle** — wait for the decision.
