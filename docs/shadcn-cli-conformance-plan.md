# shadcn CLI 정합성 검증 및 전환 — 계획과 수행 기록

검증 2026-09-04 · 수행 2026-09-04~05 · 기준 커밋 `fc62d1e` → `8f081ef`

운영 규칙은 `AGENTS.md`의 "shadcn/ui" 절에 있다. 이 문서는 무엇을 왜 그렇게 했는지의 기록이다.

## 1. 검증 방법

`components.json`이 `style: new-york`, `rsc: false`, `cssVariables: true`이므로 레지스트리 원본은
`https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`이다.

바이트 비교는 무의미하다 — CLI는 prettier 계열(쌍따옴표·세미콜론 없음)로 파일을 쓰고 이 레포는
biome(홑따옴표·세미콜론)로 재포맷하며, `from "cn"` → `from '@/lib/utils'` 치환과 `"use client"`
제거, import/export 정렬이 모두 정상 변형이기 때문이다. 그래서 다음을 정규화한 뒤 비교한다.

- 주석 제거, 따옴표 통일, **세미콜론 제거**, 토큰 단위 분해
- import 문과 export 블록은 **식별자 집합**으로 비교 (biome가 알파벳 정렬한다)
- `react` import 라인은 비교에서 제외 (레지스트리 원본이 `import * as React`를 빠뜨리거나 값
  import로 쓰는데, 이 레포는 `verbatimModuleSyntax` 때문에 `import type`이 필요하다)

이 절차는 `scripts/shadcn-drift.mjs`(`pnpm shadcn:drift`)로 고정했다. 네트워크 실패는 경고 후
exit 0, 레지스트리에 없는 이름(404)은 "로컬 전용"으로 분류해 실패시키지 않는다.

## 2. 검증 결과 (수행 전)

`src/components/ui/`의 8개 중 **5개는 CLI 원본 그대로**였고(`card` `separator` `avatar`
`dropdown-menu` `button-group`), 3개가 손수정 상태였다.

| 파일 | 손수정 내용 |
| --- | --- |
| `input.tsx` | `InputProps` export, `invalid?: boolean` prop, `aria-invalid` 파생 |
| `button.tsx` | `primary`/`danger` variant, `loading` prop + `Loader2` + `aria-busy`, `ButtonProps` export |
| `table.tsx` | `[data-slot=table-container]` 래퍼 제거 / `TableRow` 선택 스타일 교체 / `whitespace-nowrap` 제거 |

그리고 레지스트리에 대응이 있는데 CLI 없이 수제로 만든 것이 13건 있었다 — 배지 5곳(클래스 문자열
중복), 원시 `<select>` 6개(동일 문자열 4벌 복제), `InlineAlert`, `EmptyState`, `Skeleton`,
`Pagination`, `ClusterBreadcrumb`, `FilterField`, `button`의 loading 스피너.

## 3. 확정 정책

1. `src/components/ui/*.tsx`는 CLI 산출물이며 손대지 않는다. 정규화 diff 0이 게이트다.
2. 커스터마이즈는 `src/components/domain/` 또는 `state/` 래퍼로 얹는다.
3. 레지스트리에 대응이 있는 수제 구현은 전부 CLI 컴포넌트 위로 옮긴다 — **레지스트리 컴포넌트가
   이 앱과 맞지 않는 시각 기본값을 갖고 있어도 그렇게 한다.** 기본값은 래퍼에서 취소하고, 쓰지 않는
   레지스트리 export가 knip에 쌓이는 것은 감수한다. 다만 시맨틱(heading 레벨, aria 속성) 손실은
   허용하지 않으며, 그럴 땐 해당 하위 컴포넌트만 건너뛴다.

## 4. 수행 결과

커밋 15개. `ui/` 컴포넌트 8 → **18개**, 전부 드리프트 0.

| 커밋 | 내용 |
| --- | --- |
| `be22332` | 드리프트 검사 스크립트 |
| `9ca296f` | `table` 원본 복원 · 셀 줄바꿈과 선택 강조를 도메인 층으로 |
| `67a675b` | `button` 원본 복원 · loading을 `AsyncButton`으로 (+`spinner`) |
| `229b63b` | `input` 원본 복원 · `invalid` → 표준 `aria-invalid` |
| `c25e4bd` | 수제 배지 5종을 `badge` 위로 · 톤 테이블 3벌 → 1벌 |
| `f780088` | `ui/**`에 Fast Refresh 규칙 예외 |
| `e8b7039` | 폼 필드를 `field`/`label` 위로 |
| `3d511d2` | 원시 `select` 6곳 → `native-select` |
| `21a5a38` | 벤더 lint 예외를 실제 위반 파일로 좁힘 |
| `f884500` | `InlineAlert` → `alert` |
| `50e1d96` | `EmptyState` → `empty` |
| `c5d86ef` | `Skeleton` → `skeleton` |
| `bd368aa` | `ClusterBreadcrumb` → `breadcrumb` |
| `8f081ef` | `Pagination` → `pagination` 구조 |

최종 게이트: `pnpm shadcn:drift` exit 0 (18개 OK) · `pnpm build` 성공 · `pnpm test` 67 files /
639 tests · `pnpm lint` 경고 0건 · `pnpm run knip` unused exports 44 / types 2.

### 새로 생긴 도메인 래퍼

`tone-badge`(5톤 배지), `data-table`(셀 줄바꿈 기본값 뒤집기), `async-button`(loading 계약).
기존 `table-scroll-wrapper`, `state/skeleton`, `state/inline-alert`, `state/empty-state`,
`state/status-badge`, `domain/batch-type-badge`는 레지스트리 위의 래퍼로 다시 쓰였다.

## 5. 수행 중 드러난 사실

### shadcn CLI 4.21.0의 재현되는 버그

`shadcn add`를 돌린 **모든** 경우(9회)에 재현됐다. 대응 절차는 `AGENTS.md`에 옮겨 적었다.

- `import { cn } from "cn"` 플레이스홀더가 치환되지 않는다.
- npm에 실재하는 무관한 패키지 `cn@0.2.5`를 `package.json`/`pnpm-lock.yaml`에 **실제로 설치한다.**
- 레지스트리 원본이 `import * as React`를 값 import로 쓰거나(`alert`) 아예 빠뜨린 채
  `React.ComponentProps`를 타입으로 쓴다(`empty`, `spinner`).

### 레지스트리 컴포넌트 자체의 결함

- `field.tsx` — `length == 1`(느슨한 비교), `key={index}`, `<div role='group'>`
- `breadcrumb.tsx` — `<span role='link'>`에 `tabIndex` 없음
- `pagination.tsx` — `<nav role='navigation'>` 중복 role
- `empty.tsx` — `EmptyDescription`이 타입은 `ComponentProps<'p'>`인데 `<div>`를 렌더한다
- `native-select.tsx` — 래퍼 div가 `w-fit` 고정이고 `className`을 자기 자신에게 전달하지 않아,
  그리드 안에서 내용 폭으로 쪼그라든다 (`FilterField`에 `[&_[data-slot=native-select-wrapper]]:w-full`
  훅으로 대응)

lint 위반은 손으로 고치면 드리프트가 깨지므로 `biome.json` overrides에 **파일별로** 예외를 넣었다.

### 통째로 쓰지 못한 레지스트리 컴포넌트

`AlertTitle`/`EmptyTitle`(→ `h3` 개요 손실), `PaginationLink` 계열(→ `role=link`, `disabled`
불가, 영문 라벨), `Field`(→ 불필요한 `role="group"`과 레이아웃), `EmptyHeader`(→ 가운데 정렬 강제).
근거는 각 래퍼의 주석에 있다.

### 회귀를 막은 지점

- **테이블 이중 `overflow-x-auto`** — 레지스트리 컨테이너를 복원하면 `TableScrollWrapper`의 측정이
  항상 "스크롤 불가"가 되어 키보드 접근성과 엣지 페이드가 죽는다. 래퍼를 "뷰포트 소유자"에서
  "레지스트리 컨테이너 장식자"로 바꿔 해결했고, 회귀 테스트를 새로 넣었다.
- **`whitespace-nowrap` 복원** — 셀 기본값이 nowrap이면 자식의 `wrap-anywhere`를 이겨 긴 한글
  헤드라인이 넘친다. `domain/data-table.tsx`에서 기본값을 뒤집어 셀 40곳을 손대지 않았다.
- **`aria-describedby` ↔ 오류 `id` 연결** — 기존 테스트가 속성 문자열만 단언하고 그 id를 가진
  요소의 존재는 확인하지 않고 있었다. `document.getElementById`로 실제 연결을 확인하는 테스트를 추가.
- **breadcrumb의 `aria-label='위치'`와 슬래시 구분자** — 기본값이 영문 `"breadcrumb"`과 chevron
  아이콘이라 조용히 되돌아간다. 테스트로 못박았다.

### 사전 조사가 틀렸던 것

- `variant='primary'` "실사용 0건" → 실제로는 `dev-role-simulator.tsx`에 2곳.
  `variant={role === 'user' ? 'primary' : 'ghost'}`처럼 계산된 표현식이라 리터럴 grep에 안 잡혔다.
  TypeScript가 잡았다.
- `input`의 `invalid` prop → 이미 죽은 코드였다. `Input`이 `aria-invalid`를 쓴 뒤 `{...props}`를
  그 뒤에 스프레드하는데 호출부가 함께 넘기던 `getFieldProps()`에 `aria-invalid`가 이미 있어
  항상 스프레드 쪽이 이겼다.

교훈: grep은 리터럴만 본다. 계약이 실제로 살아있는지는 TypeScript와 테스트로 확인한다.

## 6. 남은 것

- `state/skeleton.tsx`의 `SkeletonText`/`SkeletonTableRows`, `domain/pipeline-stages`,
  `description-list`, `log-box`, `table-scroll-wrapper`, `state/direction-indicator`, `shell/*`는
  레지스트리에 대응이 없다. 도메인 컴포넌트로 유지한다.
- `--chart-*`/`--sidebar-*` 토큰이 없어 `chart`/`sidebar` 계열은 추가 시 별도 작업이 필요하다.
- knip의 unused exports 44건 중 상당수가 쓰지 않는 레지스트리 export다(`Field*` 8,
  `Empty*` 5, `Pagination*` 4 등). 의도된 비용이며, 새 항목이 생기면 그 출처인지만 확인한다.
