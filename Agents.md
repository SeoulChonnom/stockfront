# Agent Notes

## Commands

- Use `pnpm`; this is a single-package repo with `pnpm-lock.yaml` and no workspace file.
- `pnpm dev` starts Vite, `pnpm test` runs `vitest run`, and `pnpm lint` runs `eslint .`.
- `pnpm build` is the only typecheck script: it runs `tsc -b && vite build`.
- There is no CI, pre-commit hook, task runner, or codegen config in the repo.

## App Shape

- This is a Vite React SPA, not Next.js. The root entry is `src/main.tsx`; `src/App.tsx` owns auth bootstrap, route parsing, theme, document title, and page focus.
- Routing is custom. Use `src/lib/router.ts` (`navigate`, `buildUrl`, `useUrlState`) and `src/lib/app-state.ts` (`parseRoute`, URL filter parsing); do not introduce framework-router assumptions.
- Data fetching goes through React Query hooks in `src/lib/query-hooks.ts`, API calls in `src/lib/api/*`, and DTO-to-view mapping in `src/lib/mappers.ts`.
- Shared shell/UI lives in `src/components`; route screens live in `src/pages`; route-level orchestration lives in `src/app`.

## Runtime Gotchas

- `VITE_API_HOST` is required. `src/lib/auth-config.ts` requires it to be an absolute origin with no path, query, or hash; `.env.example` uses `http://localhost:8000`.
- Auth bootstrap POSTs to `${VITE_API_HOST}/api/user/token` with credentials included, stores the returned access token, and redirects production failures to `${VITE_API_HOST}/login`.
- `VITE_APP_ENV=development` enables the auth-bypass path used by tests and local development.
- `/` is normalized to `/market/latest` after auth resolves. `buildUrl` drops empty, `null`, and `undefined` query values.

## Code Style And Tests

- Use the `@/` alias for `src` imports when it improves clarity; Vite and TS both define it.
- TypeScript uses strict bundler-mode settings, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, and `noUnused*`; keep imports ESM-friendly.
- ESLint is type-aware via `typescript-eslint` `recommendedTypeChecked` and `projectService: true`.
- Vitest runs in `jsdom` with globals and loads `src/test/setup.ts` for `@testing-library/jest-dom/vitest`.
- Biome is configured in `biome.json`. Before commit, please run `npx @biomejs/biome check --write` for formatting and linting.
- Before commit, please run `pnpm run knip` for checking unused files, dependencies, and exports. It is configured and executable, but currently reports known existing unused files, dependencies, and exports. Do not treat those as newly introduced unless a change adds to them.
