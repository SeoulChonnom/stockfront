# Design V2 Harness Retirement Design

Date: 2026-08-12
Status: approved implementation plan

## Goal

The frontend has converged closely enough with the `docs/design_v2` reference set that the project-specific parity harnesses should be retired. The implementation must remove those retired design-translation assets while preserving product behavior, ordinary test coverage, and reusable generic UI verification capability.

This change is intentionally operational and documentary. It does **not** change runtime UX, route behavior, API calling behavior, auth flow, or screen semantics.

## Scope summary

Implement exactly the following:

- Add `docs/backend-dependencies.md` as the single remaining documentation artifact for unresolved backend contracts.
- Remove `docs/design_v2` entirely, including generated or captured artifacts tied to that retired design package.
- Remove project-specific parity and visual-audit harnesses, capture-only Playwright specs, and their dedicated config/scripts.
- Preserve normal E2E coverage, mock API support, product regression tests, and the generic reusable `.agents/skills/pixel-perfect-react-ui` skill.
- Replace stale `design_v2` references in code or tests with self-contained rationale/comments where needed.
- Preserve generic ignore support for reusable skill outputs: `.visual-audit/artifacts/` and `.visual-audit/tmp-*`.

## Required backend dependency document

Create `docs/backend-dependencies.md` and retain only unresolved backend-facing items that still matter after the design pack is removed. The document should capture, for each item, the current frontend fallback/assumption, the desired backend contract, and the most relevant frontend code locations.

The unresolved items to preserve are:

1. `metadata.isLatest` contract for distinguishing latest-vs-archive market views.
2. D-05 prior/next business-day navigation API.
3. D-06 same-date version list API.
4. D-11 advanced batch options authorization/audit policy.
5. D-13 structured PARTIAL payload with missing-section detail.
6. 401/403 error code contract.
7. 409 response contract returning existing `jobId`.
8. D-16 polling / SLA contract for async batch refresh behavior.

No other `design_v2` planning material should survive once this document exists.

## Architecture and component impact

This retirement should affect only supporting assets, references, and tests around visual parity workflows. The application architecture remains the same:

- Vite React SPA entry, routing, auth bootstrap, and React Query data flow remain unchanged.
- Product pages, shell components, view-model mappers, and error presentation continue to behave exactly as before.
- Existing mock API fixtures and ordinary Playwright/Vitest regression coverage remain in place.

Expected touched areas are limited to:

- documentation and docs references
- parity-only scripts/configuration
- capture-only Playwright specs
- package scripts, ignore rules, and auxiliary config references
- comments or test descriptions that still mention `docs/design_v2`

## Data flow and runtime behavior

There must be no runtime behavior change.

- No component logic should be altered merely because the harness is removed.
- No API request shape, polling behavior, auth behavior, or route parsing should change in this retirement.
- Any edits in product code should be limited to comment cleanup or wording changes that decouple the codebase from the retired design-doc location.

## Error handling expectations

Error handling behavior in the app must remain exactly as-is. The only error-handling-related deliverable is documentary:

- preserve unresolved backend contracts in `docs/backend-dependencies.md`
- explicitly record the current fallback behavior for missing 401/403 and 409 response detail
- explicitly record the current fallback behavior for partial payload handling and batch polling/SLA assumptions

The retirement itself must not introduce new fallback logic or alter existing user-visible error states.

## Deletion set

Delete these retired assets, plus any directly associated empty directories left behind:

- `docs/design_v2/**`
- project-specific visual-audit implementation files under `.visual-audit` that exist only for the retired parity flow
- `scripts/parity/**`
- `e2e/parity-capture.spec.ts`
- `e2e/capture-screenshots.spec.ts`
- `playwright.parity.config.ts`

Also remove associated package scripts, config entries, and ignore references that exist solely for those retired tools.

Do **not** delete:

- normal `playwright.config.ts`
- ordinary E2E specs
- `e2e/fixtures/mock-api.ts` and general mock infrastructure
- generic reusable visual-verification skills or their general-purpose output ignores

## Ignore policy after cleanup

Keep generic ignore coverage that is still useful outside this retired effort:

- `.visual-audit/artifacts/`
- `.visual-audit/tmp-*`

Retire ignore entries that reference the removed project-specific parity toolchain if they no longer serve an independent purpose.

## Testing and verification requirements

Implementation verification should prove that cleanup did not cause unintended side effects.

Required checks after implementation:

- `pnpm lint:fix`
- `pnpm test`
- `pnpm build`
- relevant E2E run(s) for the normal suite
- `pnpm run knip`

Verification must distinguish between:

- newly introduced failures caused by the cleanup
- pre-existing failures or known `knip` findings that are already tolerated by the repo

Also verify there are no meaningful residual references to:

- `docs/design_v2`
- parity harness names
- project-specific visual-audit implementation files

Generic reusable references that intentionally remain are acceptable.

## Self-review checklist

- Scope is intentionally destructive only for the user-approved retired assets.
- Recoverability is acceptable because the change is limited to tracked docs/scripts/tests/config and can be restored from version control if needed.
- No contradiction: the cleanup removes project-specific `.visual-audit` implementation while preserving generic `.visual-audit/artifacts/` and `.visual-audit/tmp-*` ignore patterns.
- No ambiguity: preserving normal tests excludes only capture/parity-only specs, not product regression coverage.
- No runtime behavior changes are authorized.

## Non-goals

- redesigning screens
- changing frontend product logic
- adding new backend fallback behavior
- deleting the generic pixel-perfect skill
- weakening ordinary test coverage
