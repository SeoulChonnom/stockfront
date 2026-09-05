# Agent Notes

## Commands

- Use `pnpm`; this is a single-package repo with `pnpm-lock.yaml` and no workspace file.
- `pnpm dev` starts Vite, `pnpm test` runs `vitest run`, and `pnpm lint` runs `biome check` (`pnpm lint:fix` applies the safe fixes).
- `pnpm build` is the only typecheck script: it runs `tsc -b && vite build`.
- `pnpm shadcn:drift` compares `src/components/ui/**` against the shadcn registry. Network failures are skipped, not failed — it never blocks an offline build.
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

## shadcn/ui

- `src/components/ui/**`는 **shadcn CLI 산출물이다. 손으로 고치지 않는다** — 주석 한 줄도 넣지 마라. `pnpm shadcn:drift`가 레지스트리 원본(`https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`)과 토큰 단위로 대조해 강제한다. 이 게이트는 현재 18개 컴포넌트에서 드리프트 0건이다.
- 변형이 필요하면 `src/components/domain/`(또는 `state/`) 래퍼로 얹는다. 지금 그렇게 사는 것들: `tone-badge`(5톤 배지), `data-table`(셀 줄바꿈 기본값 뒤집기), `async-button`(loading), `table-scroll-wrapper`(가로 스크롤 접근성), `state/skeleton`(shimmer), `state/inline-alert`, `state/empty-state`.
- **`shadcn init`을 다시 돌리지 마라.** `:root`에 자체 팔레트를 써 넣어 `src/index.css`의 `@theme inline` 브리지(shadcn 표준 변수 → 이 레포 고유 토큰)를 깨뜨린다. `components.json`의 `baseColor: slate`는 실제 팔레트와 무관한 잔값이다. 컴포넌트 추가는 `shadcn add`만.
- `--chart-1..5`, `--sidebar-*` 토큰이 없다. `chart`/`sidebar` 계열을 추가하면 즉시 깨진다.

### `shadcn add` 후 반드시 할 것

CLI 4.21.0에는 재현되는 버그가 있다. `add` 한 번마다 매번:

1. `import { cn } from "cn"` 플레이스홀더가 치환되지 않는다 → `@/lib/utils`로 고친다. `from "@/registry/new-york-v4/ui/<x>"`도 `@/components/ui/<x>`로.
2. npm의 무관한 패키지 `cn@0.2.5`를 `package.json`/`pnpm-lock.yaml`에 **실제로 설치한다** → `git checkout -- package.json pnpm-lock.yaml` 후 `pnpm install`로 정리.
3. 레지스트리 원본이 `import * as React`를 값 import로 쓰거나(값으로는 안 씀) 아예 빠뜨린 채 `React.ComponentProps`를 타입으로 쓴다 → `verbatimModuleSyntax` 때문에 빌드가 깨지므로 `import type * as React from 'react';`로 맞춘다. 드리프트 스크립트는 `react` import 라인을 비교에서 제외하므로 안전하다.
4. `git diff src/index.css components.json` 확인 (지금까지는 건드린 적 없다).
5. `registryDependencies`가 있으면 기존 파일을 덮어쓴다(예: `pagination` → `button`). 덮어쓴 파일에도 1~3을 적용하고 `pnpm shadcn:drift`가 그 파일에 대해 `OK`를 유지하는지 확인한다.
6. `pnpm lint:fix`로 포맷을 맞춘다. 레지스트리 원본이 이 레포 biome 규칙을 위반하면(`field.tsx`의 `==`·`key={index}`·`role='group'`, `breadcrumb.tsx`의 `role='link'`, `pagination.tsx`의 중복 `role='navigation'`) `biome.json` overrides에 **그 파일만 지정해서** 예외를 추가한다. 디렉터리 전체에 끄지 말고, 실제로 걸린 규칙만 넣는다.

### 레지스트리 컴포넌트를 통째로 쓰지 못할 때

시맨틱을 잃으면서까지 맞추지 않는다. 하위 컴포넌트만 골라 쓰고 근거를 주석에 남긴다. 지금 그런 자리들:

- `AlertTitle`/`EmptyTitle`은 `asChild` 없는 `<div>`라 제목의 `h3`가 문서 개요에서 사라진다(테스트가 `getByRole('heading', { level: 3 })`로 단언 중) → 직접 `<h3>`를 쓴다.
- `PaginationLink` 계열은 `asChild` 없는 `<a>`라 `role`이 `link`가 되고 `disabled`를 표현할 수 없다 → `Pagination`/`PaginationContent`/`PaginationItem`(nav > ul > li)만 쓰고 안쪽은 `Button`.
- `Field`는 `role="group"`과 자체 레이아웃을 얹는다 → `FieldLabel`/`FieldError`만 쓴다.

쓰지 않은 레지스트리 export는 `pnpm run knip`에 미사용으로 쌓인다. 이건 **의도된 비용**이니 새 항목이 전부 그 출처인지만 확인하고 넘어간다.

## Code Style And Tests

- Use the `@/` alias for `src` imports when it improves clarity; Vite and TS both define it.
- TypeScript uses strict bundler-mode settings, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, and `noUnused*`; keep imports ESM-friendly.
- Linting and formatting are both Biome (`biome.json`); ESLint has been removed. Biome does not do type-aware linting, so `pnpm build` (`tsc -b`) is the only thing that catches type-level problems — run it, not just the linter.
- Vitest runs in `jsdom` with globals and loads `src/test/setup.ts` for `@testing-library/jest-dom/vitest`.
- Biome is configured in `biome.json`. Before commit, please run `pnpm lint:fix` for formatting and linting. (Do not run `npx biome` — the bare `biome` name on npm is an unrelated package; use the `@biomejs/biome` devDependency via the pnpm scripts.)
- Before commit, please run `pnpm run knip` for checking unused files, dependencies, and exports. It is configured and executable, but currently reports known existing unused files, dependencies, and exports. Do not treat those as newly introduced unless a change adds to them.
