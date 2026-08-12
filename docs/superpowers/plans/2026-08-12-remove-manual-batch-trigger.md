# Remove Manual Batch Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every frontend path that starts the integrated daily batch while preserving AI-summary retry and read-query retry behavior.

**Architecture:** Delete the manual-trigger feature vertically from the batch operations page through its React Query hook and API client. Remove feature-specific tests and mock routes, then retain focused assertions that the page has no manual-run entry point and that eligible existing jobs can still use AI retry.

**Tech Stack:** Vite, React, TypeScript, TanStack React Query, Vitest, Testing Library, Playwright, Biome, pnpm

## Global Constraints

- Preserve `POST /stock/api/batch/jobs/{jobId}/retry-ai` and the `AI 요약만 재시도` control.
- Preserve list/detail retry and refresh controls because they retry reads.
- Do not change backend API specification documents.
- Do not refactor adjacent batch history, filtering, polling, detail, or snapshot-navigation code.
- Preserve unrelated untracked files already present in the worktree.

---

### Task 1: Remove Manual-Run UI and Page Orchestration

**Files:**
- Modify: `src/pages/batch-operations-page.test.tsx`
- Modify: `src/pages/batch-operations-page.tsx`
- Modify: `src/pages/batch-operations/batch-header.tsx`
- Modify: `src/pages/batch-operations/batch-detail-panel.tsx`
- Modify: `src/pages/batch-operations/batch-detail-content.tsx`
- Modify: `src/pages/batch-operations/batch-detail-content.test.tsx`
- Modify: `src/pages/batch-operations/format-batch.ts`
- Delete: `src/pages/batch-operations/batch-trigger-banner.tsx`
- Delete: `src/pages/batch-operations/trigger-dialog.tsx`
- Delete: `src/pages/batch-operations/trigger-dialog-idle.tsx`
- Delete: `src/pages/batch-operations/trigger-dialog-states.tsx`
- Delete: `src/pages/batch-operations/trigger-error.ts`
- Delete: `src/pages/batch-operations/trigger-dialog.test.tsx`

**Interfaces:**
- Consumes: `useBatchJobs`, `useBatchJobDetail`, and `useRetryAiMutation` from `src/lib/query-hooks.ts`.
- Produces: `BatchHeader()` with no trigger callback and `BatchDetailContentProps` with no `onReRun` callback.

- [ ] **Step 1: Replace the obsolete dialog-opening test with a failing absence test**

In `src/pages/batch-operations-page.test.tsx`, replace `opens the Manual Trigger dialog from the header button` with:

```tsx
it('does not expose manual batch execution while preserving AI retry', () => {
  mockUseBatchJobs.mockReturnValue(jobsReady());
  mockUseBatchJobDetail.mockReturnValue(
    detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
  );

  renderPage();

  expect(
    screen.queryByRole('button', { name: '수동 실행' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '같은 기준일 재실행' })
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/재실행 (가능|불필요)/)).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'AI 요약만 재시도' })
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/pages/batch-operations-page.test.tsx -t "does not expose manual batch execution"`

Expected: FAIL because `수동 실행` and `같은 기준일 재실행` still render.

- [ ] **Step 3: Remove the manual-run UI with the minimum production edits**

Make these exact changes:

- `BatchHeader` takes no props and renders only the title/copy container; remove its `Button` import and trigger button.
- `AdminBatchOperations` no longer imports `can`, `useStartBatchRunMutation`, `BatchTriggerBanner`, `TriggerBannerState`, or `TriggerDialog`; remove trigger mutation/state/banner/dialog and render `<BatchHeader />`.
- Remove `onReRun` from `BatchDetailPanelProps`, `BatchDetailPanel`, and `BatchDetailContentProps`.
- Remove the `같은 기준일 재실행` button and `재실행 가능`/`재실행 불필요` span from `BatchDetailContent`; retain the snapshot link and `AI 요약만 재시도` button.
- Remove `isRetryableStatus` only if it has no remaining caller.
- Delete the five manual-trigger component/helper files and their dedicated unit test listed above.
- Update `batch-detail-content.test.tsx` render defaults so they no longer pass `onReRun`.

- [ ] **Step 4: Run focused component/page tests and verify GREEN**

Run: `pnpm test -- src/pages/batch-operations-page.test.tsx src/pages/batch-operations/batch-detail-content.test.tsx`

Expected: both files pass with no dialog/manual-run assertion remaining and AI retry coverage still passing.

- [ ] **Step 5: Commit the UI removal**

```bash
git add src/pages/batch-operations-page.tsx src/pages/batch-operations-page.test.tsx src/pages/batch-operations/batch-header.tsx src/pages/batch-operations/batch-detail-panel.tsx src/pages/batch-operations/batch-detail-content.tsx src/pages/batch-operations/batch-detail-content.test.tsx src/pages/batch-operations/format-batch.ts src/pages/batch-operations/batch-trigger-banner.tsx src/pages/batch-operations/trigger-dialog.tsx src/pages/batch-operations/trigger-dialog-idle.tsx src/pages/batch-operations/trigger-dialog-states.tsx src/pages/batch-operations/trigger-error.ts src/pages/batch-operations/trigger-dialog.test.tsx
git commit -m "refactor: remove manual batch trigger UI"
```

### Task 2: Remove Manual-Trigger API, Types, and Capability

**Files:**
- Modify: `src/lib/api/batch.ts`
- Modify: `src/lib/api/types.ts`
- Modify: `src/lib/query-hooks.ts`
- Modify: `src/lib/capabilities.ts`
- Modify: `src/lib/capabilities.test.ts`
- Modify: `src/components/state/permission-state.tsx`
- Modify: `src/pages/batch-operations-page.test.tsx`

**Interfaces:**
- Consumes: `retryAiSummary(jobId: number, idempotencyKey?: string)`.
- Produces: batch read hooks plus `useRetryAiMutation`; no frontend `market-daily` POST interface or `ops.advancedTriggerOptions` capability.

- [ ] **Step 1: Update static capability expectations before removing production entries**

Delete the two `ops.advancedTriggerOptions` assertions from `src/lib/capabilities.test.ts`, then add this compile-time/runtime expectation to the admin capability test:

```tsx
expect(can('ops.trigger', 'admin')).toBe(true);
```

In `src/pages/batch-operations-page.test.tsx`, remove the `mockUseStartBatchRunMutation` setup and assert that the retained `mockUseRetryAiMutation` is not called for a non-admin user.

- [ ] **Step 2: Remove the manual-trigger data path**

Make these exact changes:

- Remove `startBatchRun` and its `BatchRunRequest`/`BatchRunResponse` imports from `src/lib/api/batch.ts`.
- Remove `BatchRunRequest` and `BatchRunResponse` from `src/lib/api/types.ts`.
- Remove `startBatchRun`, `BatchRunRequest`, and `useStartBatchRunMutation` from `src/lib/query-hooks.ts`; leave `useRetryAiMutation` unchanged.
- Remove `ops.advancedTriggerOptions` from the `Capability` union and admin set; retain `ops.trigger` because it gates AI retry.
- Change permission copy from `이 화면은 파이프라인 로그와 수동 실행을 포함하므로` to `이 화면은 배치 이력과 파이프라인 로그를 포함하므로`.

- [ ] **Step 3: Run focused API, hook, capability, and page tests**

Run: `pnpm test -- src/lib/api/batch.test.ts src/lib/query-hooks.test.tsx src/lib/capabilities.test.ts src/pages/batch-operations-page.test.tsx`

Expected: PASS; `retryAiSummary` and `useRetryAiMutation` tests remain green.

- [ ] **Step 4: Check for production references to removed interfaces**

Run:

```bash
rg -n "startBatchRun|BatchRunRequest|BatchRunResponse|useStartBatchRunMutation|advancedTriggerOptions|market-daily|같은 기준일 재실행|재실행 가능|재실행 불필요|수동 실행" src
```

Expected: no matches.

- [ ] **Step 5: Commit the data-path removal**

```bash
git add src/lib/api/batch.ts src/lib/api/types.ts src/lib/query-hooks.ts src/lib/capabilities.ts src/lib/capabilities.test.ts src/components/state/permission-state.tsx src/pages/batch-operations-page.test.tsx
git commit -m "refactor: remove manual batch trigger client"
```

### Task 3: Remove Manual-Trigger E2E Coverage and Mock Support

**Files:**
- Delete: `e2e/trigger.spec.ts`
- Modify: `e2e/a11y.spec.ts`
- Modify: `e2e/permissions.spec.ts`
- Modify: `e2e/fixtures/mock-api.ts`

**Interfaces:**
- Consumes: existing batch list/detail fixtures and retry-AI mock route.
- Produces: an E2E mock API with no `POST /stock/api/batch/market-daily` behavior and permission/a11y specs with no trigger-dialog assumptions.

- [ ] **Step 1: Delete obsolete E2E expectations**

- Delete `e2e/trigger.spec.ts`.
- Delete the `Manual Trigger Dialog — focus trap / Escape / return` describe block from `e2e/a11y.spec.ts`.
- Rename the admin permissions test to `the ops nav item is present and /ops/batches renders the admin screen`, remove its `#trigger-btn` visibility assertion, and add:

```tsx
await expect(page.getByRole('button', { name: '수동 실행' })).toHaveCount(0);
```

- Keep the non-admin access-control assertions, but remove trigger-specific comments and `#trigger-btn` checks that no longer distinguish roles.

- [ ] **Step 2: Remove mock support used only by the deleted trigger spec**

From `e2e/fixtures/mock-api.ts`, remove:

- `triggerResult` and its trigger-only result/error types or constants when unreferenced.
- `triggerMode` from `MockApiOptions` and its default local variable.
- The `POST /stock/api/batch/market-daily` route.
- `syntheticRunningJob` if no remaining detail fixture requires it; change the lookup fallback to the existing honest not-found behavior rather than synthesizing a triggered job.
- Trigger-only comments, while preserving retry-AI route behavior and shared error fixtures used elsewhere.

- [ ] **Step 3: Verify the E2E tree contains no manual-trigger references**

Run:

```bash
rg -n "trigger-btn|Manual Trigger|market-daily|triggerMode|triggerResult|수동 실행|같은 기준일 재실행" e2e
```

Expected: only the explicit admin absence assertion for `수동 실행` may remain.

- [ ] **Step 4: Run affected Playwright specs**

Run: `pnpm exec playwright test e2e/permissions.spec.ts e2e/a11y.spec.ts e2e/batch-ops.spec.ts`

Expected: PASS; batch-ops AI retry scenario remains green. If the configured local backend/browser dependency is unavailable, record the exact failure and continue with static, unit, build, and lint verification.

- [ ] **Step 5: Commit the E2E cleanup**

```bash
git add e2e/trigger.spec.ts e2e/a11y.spec.ts e2e/permissions.spec.ts e2e/fixtures/mock-api.ts
git commit -m "test: remove manual batch trigger coverage"
```

### Task 4: Full Verification

**Files:**
- Verify only; apply formatting changes only to files already touched by Tasks 1-3.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified frontend with no manual batch start path and retained AI retry.

- [ ] **Step 1: Run formatting and lint fixes**

Run: `pnpm lint:fix`

Expected: exit 0. Inspect `git diff --stat` and revert no unrelated user changes; formatting changes must be limited to task files.

- [ ] **Step 2: Run all unit tests**

Run: `pnpm test`

Expected: all Vitest tests pass.

- [ ] **Step 3: Run typecheck and production build**

Run: `pnpm build`

Expected: `tsc -b && vite build` exits 0.

- [ ] **Step 4: Run unused-code analysis**

Run: `pnpm run knip`

Expected: no new finding caused by this change; report known pre-existing findings separately.

- [ ] **Step 5: Inspect the final diff and reference scan**

Run:

```bash
git diff --check HEAD~3..HEAD
rg -n "startBatchRun|BatchRunRequest|BatchRunResponse|useStartBatchRunMutation|advancedTriggerOptions|market-daily|trigger-btn|같은 기준일 재실행|재실행 가능|재실행 불필요|수동 실행" src e2e
git status --short
```

Expected: diff check passes; no removed production/manual-trigger references remain; only unrelated pre-existing untracked files remain.

- [ ] **Step 6: Commit any verification-only formatting changes**

If `pnpm lint:fix` changed touched files after earlier commits:

```bash
git add src e2e
git commit -m "style: format manual trigger removal"
```

Otherwise, do not create an empty commit.
