# Remove Manual Batch Trigger Design

## Goal

Remove every frontend path that can manually start the integrated daily batch while preserving retry actions that operate on an existing job.

## Scope

- Remove the batch-page header's `수동 실행` button.
- Remove the detail panel's `같은 기준일 재실행` action and its `재실행 가능`/`재실행 불필요` status copy.
- Remove the manual-trigger dialog, form, result banner, error handling, and page state.
- Remove the frontend `POST /stock/api/batch/market-daily` client, React Query mutation, request/response types, and the capability used only by advanced trigger options.
- Remove or update unit tests, end-to-end tests, accessibility checks, permission checks, and mock API support that exist only for manual triggering.
- Update frontend permission copy so it no longer claims that the page includes manual execution.

## Preserved Behavior

- Keep `AI 요약만 재시도` and its `POST /stock/api/batch/jobs/{jobId}/retry-ai` flow.
- Keep list and detail query retry/refresh controls, because they retry reads rather than start a batch.
- Keep backend API specification documents; removing the backend endpoint is outside this frontend change.
- Keep batch history, filters, polling, detail inspection, and snapshot navigation unchanged.

## Implementation Boundary

Delete manual-trigger-only files and remove orphaned imports, props, state, helpers, types, capability entries, fixtures, and tests. Do not refactor adjacent batch operations code. Shared mock helpers are removed only when no remaining test uses them.

## Verification

- A focused test must show that the batch page has no manual-run entry points while AI retry remains available for an eligible `PARTIAL` job.
- Run affected Vitest suites, then the full test suite.
- Run `pnpm lint:fix`, `pnpm build`, and `pnpm run knip`; distinguish pre-existing knip findings from regressions.
- Run the remaining Playwright coverage affected by permission and accessibility expectation changes when the local test environment supports it.
