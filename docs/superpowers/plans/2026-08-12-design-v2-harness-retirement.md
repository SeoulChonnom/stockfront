# Design v2 Harness Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the completed design-v2 reference package and its project-specific comparison harnesses while preserving product behavior, ordinary regression coverage, and a concise record of unresolved backend contracts.

**Architecture:** Keep the current application and normal Playwright/Vitest infrastructure unchanged. Remove only design-translation inputs, capture-only specs, and parity/visual-audit wiring; replace stale document pointers with self-contained rationale and retain generic visual-audit output ignores for the reusable pixel-perfect skill.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Playwright, Biome, Knip, pnpm.

## Global Constraints

- Do not change runtime behavior.
- Preserve ordinary E2E specs, `e2e/fixtures/mock-api.ts`, product tests, and `.agents/skills/pixel-perfect-react-ui`.
- Preserve unrelated user-owned files, including `.codegraph/`.
- Keep only unresolved backend contracts in `docs/backend-dependencies.md`.
- Remove tracked and ignored artifacts under `docs/design_v2`.

---

### Task 1: Complete the retirement cleanup

**Files:**
- Create: `docs/backend-dependencies.md`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `tsconfig.e2e.json`
- Modify: `tsconfig.node.json`
- Modify: `knip.json`
- Modify: affected `src/**/*.ts(x)` and `e2e/**/*.ts` comments/test descriptions that otherwise point to deleted design documents
- Delete: `docs/design_v2/**`
- Delete: `.visual-audit/config.json`
- Delete: `.visual-audit/servers/**`
- Delete: `scripts/parity/**`
- Delete: `e2e/parity-capture.spec.ts`
- Delete: `e2e/capture-screenshots.spec.ts`
- Delete: `playwright.parity.config.ts`

**Interfaces:**
- Consumes: current API contracts in `docs/api_spec.json`, `docs/api_spec_doc.md`, and current runtime behavior.
- Produces: no runtime interface; produces the documentation contract in `docs/backend-dependencies.md`.

- [ ] **Step 1: Verify the retirement checks fail against the pre-cleanup baseline or identify the already-applied state**

Run:

```bash
test ! -e docs/design_v2
test ! -e scripts/parity
test ! -e .visual-audit/config.json
test ! -e .visual-audit/servers
```

Expected in the current salvage state: PASS because the earlier implementation already removed the targets. Historical baseline would fail because those paths existed.

- [ ] **Step 2: Remove residual stale rationale and restore reusable-tool ignores**

Make these exact semantic changes:

```text
- Replace remaining `design v2 <line>` and prototype-only references in test names/comments with behavior-focused wording.
- Replace obsolete `Phase 8/9` and `Phase 4` labels with current self-contained descriptions.
- Keep `.visual-audit/artifacts/` and `.visual-audit/tmp-*` ignored because the preserved generic pixel-perfect skill can recreate them.
```

- [ ] **Step 3: Verify the cleanup boundary**

Run:

```bash
test ! -e docs/design_v2
test ! -e scripts/parity
test ! -e .visual-audit/config.json
test ! -e .visual-audit/servers
test -e .agents/skills/pixel-perfect-react-ui/SKILL.md
rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!.codegraph/**' --glob '!docs/superpowers/**' 'docs/design_v2|design_v2|parity-capture|playwright\.parity|scripts/parity|visual-audit:servers|visual-audit:' .
```

Expected: all path checks pass and `rg` prints no matches.

- [ ] **Step 4: Review the diff for runtime changes**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Expected: no whitespace errors; changes are limited to approved deletions, documentation, configuration cleanup, and self-contained comments/test descriptions.

### Task 2: Verify the retained application and test infrastructure

**Files:**
- Verify only; no planned production-code changes.

**Interfaces:**
- Consumes: the cleaned Vite/TypeScript/Playwright configuration.
- Produces: fresh verification evidence.

- [ ] **Step 1: Apply repository formatting and safe lint fixes**

Run:

```bash
pnpm lint:fix
```

Expected: exit 0. Review the resulting diff so Biome does not introduce unrelated semantic changes.

- [ ] **Step 2: Run unit tests**

Run:

```bash
pnpm test
```

Expected: all Vitest files and tests pass.

- [ ] **Step 3: Run the typecheck and production build**

Run:

```bash
pnpm build
```

Expected: TypeScript build and Vite production build exit 0.

- [ ] **Step 4: Run ordinary E2E regression tests**

Run:

```bash
pnpm e2e
```

Expected: all remaining Playwright tests pass; deleted capture/parity specs are not collected.

- [ ] **Step 5: Run unused-code analysis**

Run:

```bash
pnpm run knip
```

Expected: no newly introduced unused files, dependencies, or exports. Known pre-existing findings may remain and must be reported separately.

- [ ] **Step 6: Commit the approved cleanup intentionally**

```bash
git add .gitignore .visual-audit docs/backend-dependencies.md docs/design_v2 e2e knip.json package.json playwright.config.ts playwright.parity.config.ts scripts/parity src tsconfig.e2e.json tsconfig.node.json
git diff --cached --check
git commit -m "chore: retire design v2 harnesses"
```

Expected: the commit contains only the approved cleanup and preserves `.codegraph/`.
