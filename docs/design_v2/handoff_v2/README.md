# Handoff: Market Brief UI v2

## 1. Overview

`stockfront`(Vite + React SPA)의 Market Brief 화면 전체를 UI v2로 재설계한 결과다. 기능·URL·API 계약은 그대로 두고 정보 구조, 내비게이션, 상태 표현, 반응형 경험, 권한 경계를 바꾼다.

해결하는 문제는 `docs/design_v2/05-redesign-brief.md`의 P0/P1 목록과 동일하다.

- 모바일에서 272px sidebar가 본문보다 먼저 노출됨
- sidebar와 topbar에 primary navigation 중복
- Archive/Batch 고정폭 table로 문서 전체 가로 스크롤(390px에서 약 862px)
- Batch API/View Model에 `page`가 있으나 UI에 pagination 없음 → 20건 이후 접근 불가
- 일반 사용자에게 운영 로그·Manual Trigger 노출
- Latest와 Archive Detail의 모드 구분이 제목 한 줄뿐
- loading/error가 필터·이전 결과·복구 경로를 모두 제거
- Trigger 성공 피드백·job ID·409/403 처리 부재
- PARTIAL이 누락 범위·영향·다음 행동을 설명하지 않음
- Cluster에서 진입 원점·스크롤 문맥 복귀 불가
- Coming soon 요소가 primary navigation 공간 점유
- skip link/route focus/live region 계약 부족

## 2. About the Design Files

이 번들의 `Market Brief v2.dc.html`과 `fixtures.js`는 **디자인 레퍼런스**다. 의도한 레이아웃·상태·인터랙션을 브라우저에서 확인할 수 있게 만든 프로토타입이며, 그대로 저장소에 복사해 쓰는 프로덕션 코드가 아니다.

작업은 **이 HTML 프로토타입을 `stockfront`의 기존 환경에서 다시 구현하는 것**이다.

- React 19 + TypeScript(strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- Tailwind CSS v4 (`@tailwindcss/vite`), `tw-animate-css`
- shadcn 계열 컴포넌트 `src/components/ui/{button,card,input,select,table}.tsx` (Radix Select, CVA, `clsx`, `tailwind-merge`)
- 커스텀 라우터 `src/lib/router.ts` + `src/lib/app-state.ts`
- TanStack Query v5 hooks `src/lib/query-hooks.ts`
- `lucide-react` 아이콘

프로토타입은 인라인 스타일 + CSS 변수로 작성됐다. 이는 스트리밍 프리뷰 환경의 제약이며 **저장소에서는 Tailwind 유틸리티와 기존 CSS 변수 체계를 쓴다**. 프로토타입이 `@media` 안에서 레이아웃 변수(`--shell`, `--md`, `--g2`, `--g3`, `--cl`, `--tc2`, `--tc3`)를 재정의하는 방식은, 저장소에서는 Tailwind 반응형 프리픽스(`md:`, `lg:`, `xl:`)로 옮긴다. 값과 분기점만 그대로 유지하면 된다.

프로토타입의 `?mock=`, `?trigger=`, `?auth=` 쿼리는 픽스처 선택용이고 **제품 URL 계약에 포함되지 않는다**. 구현에서는 Playwright 네트워크 라우팅으로 대체한다.

## 3. Fidelity

**High-fidelity.** 색·타이포·간격·상태 문구가 확정값이다. 컬러 hex, radius, 최소 타깃 크기, 한국어 UI 문구는 문서에 적힌 값을 그대로 쓴다.

단, 두 가지는 저장소 쪽을 따른다.

1. **폰트** — 프로토타입은 프리뷰 환경 제약으로 system sans를 쓴다. 저장소는 `--font-sans`(Inter), `--font-display`(Manrope)를 선언하지만 실제 폰트 asset이 없다. v2에서는 (a) 폰트 asset을 추가해 선언을 실제로 만들거나 (b) system stack으로 정직하게 정리하거나 중 하나를 **결정하고 기록**한다. 수치·ID·시각·로그에는 mono + `font-variant-numeric: tabular-nums`를 반드시 적용한다.
2. **컴포넌트 구현** — 프로토타입의 인라인 스타일 대신 기존 shadcn 컴포넌트를 쓴다. 시각 결과가 같으면 된다.

## 4. 반드시 유지할 계약

| 항목 | 내용 |
| --- | --- |
| 라우트 | `/market/latest`, `/market/archive/search`, `/market/archive/:businessDate`, `/market/cluster/:uuid`, `/ops/batches`, 404 |
| 리다이렉트 | `/` → `/market/latest` (auth resolve 후, `replace`) |
| Base path | `/stock/` — `withBasePath`, `import.meta.env.BASE_URL` |
| 라우팅 | `src/lib/router.ts`의 `navigate`/`buildUrl`/`useUrlState`, `src/lib/app-state.ts`의 `parseRoute`/`parseListFilters`. React Router·Next.js 도입 금지 |
| 데이터 흐름 | React Query hook → `src/lib/api/*` → `src/lib/mappers.ts` → `src/lib/view-models.ts` |
| API/DTO | 변경 금지. 백엔드 개선 필요분은 §13에 기록 |
| 환경 | `VITE_API_HOST` 검증(`auth-config.ts`), `VITE_APP_ENV=development` auth bypass |
| 테마 | dark/light 모두 유지, `document.documentElement.dataset.theme` |
| 명령 | `pnpm` |

라우트 정규식은 이미 `app-state.ts`에 있다. `archiveMarketRoutePattern`(`\d{4}-\d{2}-\d{2}`)과 `clusterDetailRoutePattern`(UUID v4 형태)을 그대로 쓴다.

## 5. IA와 Navigation

primary navigation은 **한 곳**에만 둔다.

```
Market Brief (브랜드)
├─ 시장 인텔리전스
│  ├─ 최신 브리프          /market/latest
│  └─ 아카이브             /market/archive/search
│       ├─ 날짜별 스냅샷    /market/archive/:date
│       └─ 이슈 상세        /market/cluster/:uuid
└─ 운영  (Operator 전용)
   └─ 배치 운영            /ops/batches   [실패 건수 배지]
```

- **Desktop (≥1025px)**: 좌측 레일 248px, `position: sticky; top:0; height:100vh`, `border-right: 1px solid var(--line)`, 배경 `--surface`. 그룹 라벨은 11px/600/`letter-spacing:.08em`/uppercase/`--fg3`. 항목은 최소 높이 40px, `border-radius:8px`, 좌측에 6px 도트. 활성 항목은 `background:--accent-soft; color:--accent; border-color:--accent-line` + `aria-current="page"`.
- **Topbar 제거.** 상단에는 route·모드·기준일 컨텍스트만 남긴다. 전역 검색, Support, Documentation, System Status, 푸터 링크는 **삭제**한다(콘텐츠·소유자 없음, `09-scope-traceability-decisions.md`의 Won't).
- **Mobile (≤1024px)**: 레일 숨김. compact header(`position:sticky; top:0; z-index:40`, 높이 약 64px) = 44×44 메뉴 버튼 + (섹션 라벨 11px caps / 현재 route 14px 600) + 44×44 테마 토글. 메뉴 버튼은 drawer를 연다.
- **Drawer**: `role="dialog" aria-modal="true"`, 좌측에서 `width:min(84vw,300px)`, `box-shadow: --sh3`, `overscroll-behavior:contain`. 오픈 시 첫 링크로 포커스 이동, Escape·오버레이 클릭으로 닫힘, 닫히면 메뉴 버튼으로 포커스 복귀. 항목 최소 높이 48px. **browser Back을 가로채지 않는다**(URL에 상태를 넣지 않음).
- 활성 규칙: `/market/archive/*`는 아카이브 활성, `/market/cluster/*`는 진입 원점(`origin` 쿼리)에 따라 최신 브리프 또는 아카이브를 활성으로 표시한다.
- 레일 하단: 사용자 칩(26px 아바타 + `ops.analyst` 12.5px/600 + 역할 11px `--fg3`), 테마 토글, (개발 빌드에서만) 상태 시뮬레이터.

## 6. Design Tokens

`src/styles/base.css`의 `:root` / `:root[data-theme="dark"]`를 아래 값으로 교체한다. **gradient 배경과 반투명 surface는 제거한다**(현재 `--surface: rgba(255,255,255,.78)`와 `radial-gradient` 배경은 금융 데이터 판독성에 불리하다).

### Color — Light

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--bg` | `#f6f8fb` | 앱 배경 |
| `--surface` | `#ffffff` | 카드·패널 |
| `--surface-2` | `#f1f4f9` | 섹션 헤더, 비교 타일, 로그 박스 |
| `--surface-3` | `#e6ebf3` | 아바타, skeleton 하이라이트 |
| `--line` | `#dce3ed` | 기본 divider·border |
| `--line-strong` | `#c2ccdb` | 입력·보조 버튼 border |
| `--text` | `#0f2743` | 본문 |
| `--text-soft` | `#4a6180` | 보조 본문 |
| `--text-faint` | `#7288a5` | 라벨·메타 |
| `--primary` | `#0f5bff` | 주요 액션·링크·활성 |
| `--primary-fg` | `#ffffff` | primary 위 텍스트 |
| `--primary-soft` | `#eaf1ff` | 활성 배경 |
| `--primary-line` | `#bdd2ff` | 활성 border |
| `--up` | `#0d8b5f` | 지수 상승 |
| `--down` | `#be3348` | 지수 하락 |
| `--success` / `-soft` / `-line` | `#0d8b5f` / `#e7f6ef` / `#a8dcc5` | READY, SUCCESS |
| `--warning` / `-soft` / `-line` | `#8a5a00` / `#fdf3dd` / `#e7cd91` | PARTIAL, 아카이브 모드 밴드, 고급 옵션 |
| `--danger` / `-soft` / `-line` | `#be3348` / `#fdecef` / `#f0b8c2` | FAILED, 오류 |
| `--info` / `-soft` / `-line` | `#0f5bff` / `#eaf1ff` / `#bdd2ff` | RUNNING, PENDING, 안내 |
| `--neutral` / `-soft` / `-line` | `#4a6180` / `#eef1f6` / `#d5dde8` | SKIPPED, 중립 배지 |
| `--focus` | `#0f5bff` | focus ring |

### Color — Dark (`[data-theme="dark"]`)

| 토큰 | 값 |
| --- | --- |
| `--bg` | `#0a1120` |
| `--surface` | `#111a2b` |
| `--surface-2` | `#16223a` |
| `--surface-3` | `#1d2c48` |
| `--line` | `#243554` |
| `--line-strong` | `#35496d` |
| `--text` | `#e9f1fb` |
| `--text-soft` | `#a3b6d0` |
| `--text-faint` | `#7c92b0` |
| `--primary` | `#6b9cff` |
| `--primary-fg` | `#07101d` |
| `--primary-soft` | `#17253f` |
| `--primary-line` | `#304b7c` |
| `--up` | `#3cd29c` |
| `--down` | `#ff7c91` |
| `--success` / `-soft` / `-line` | `#3cd29c` / `#0f2f24` / `#1f5a45` |
| `--warning` / `-soft` / `-line` | `#f4cb62` / `#31280f` / `#5d4c1b` |
| `--danger` / `-soft` / `-line` | `#ff7c91` / `#39191f` / `#6b2c37` |
| `--info` / `-soft` / `-line` | `#6b9cff` / `#17253f` / `#304b7c` |
| `--neutral` / `-soft` / `-line` | `#a3b6d0` / `#17233a` / `#2a3b5c` |
| `--focus` | `#8bb2ff` |

`color-scheme`을 테마별로 `light`/`dark`로 설정하고 `theme-color` 메타도 맞춘다. 테마 선택은 localStorage에 저장하고 없으면 `prefers-color-scheme`을 따른다(D-15).

**상태 색 사용 규칙**: 상태 배지는 `color: var(--<intent>)`, `background: var(--<intent>-soft)`, `border: 1px solid var(--<intent>-line)`을 함께 쓰고, **항상 5–6px 도트 아이콘 + 한국어 상태어를 동반한다**. 지수 등락은 텍스트 색(`--up`/`--down`)만 쓰고 배경을 칠하지 않는다. 등락에는 `+`/`-` 기호가 항상 붙으므로 색 없이도 방향을 알 수 있다.

상태어 매핑: `READY` 준비 완료 · `PARTIAL` 부분 생성 · `FAILED` 생성 실패 · `SUCCESS` 성공 · `RUNNING` 실행 중 · `PENDING` 대기 · `SKIPPED` 건너뜀.

### Typography

| 역할 | 값 |
| --- | --- |
| Display (헤드라인) | 26px / 600 / `line-height:1.35` / `letter-spacing:-.015em` / `text-wrap:pretty` — ≤640px 21px |
| h1 (페이지 제목) | 22px / 600. Brief 화면에서는 15px / 600 / `--text-faint` 킥커로 쓰고 헤드라인이 시각적 주인공 |
| h2 (섹션) | 17px / 600 |
| h3 (블록) | 13–15px / 600 |
| Lead 본문 | 16px / `line-height:1.65` — ≤640px 15px |
| 본문 | 13.5px |
| 보조 | 12.5px |
| 라벨(caps) | 11px / 600 / `letter-spacing:.07em` / uppercase / `--text-faint` |
| Mono | 11–14px, `font-variant-numeric: tabular-nums` — 지수·금액·jobId·pageId·시각·카운트·로그 전부 |

본문 최대 너비: 요약 76ch, 오류 메시지 62ch, 분석 문단 74ch.

### Spacing · Radius · Shadow · Motion

- 컨테이너 패딩 `--pad`: 32px → (≤1024) 20px → (≤640) 14px. 고밀도 모드 20px.
- 섹션 간격 `--gap`: 20px → (≤640) 12px. 고밀도 14px.
- 카드 내부 패딩: 헤더 16–20px, 본문 16–18px, 표 셀 9–12px 세로 / 12–18px 가로.
- Radius: `4px`(배지·칩·작은 컨트롤), `8px`(버튼·입력·타일), `12px`(카드·패널). pill(999px)은 nav 배지에만.
- Shadow: `--sh2 0 8px 24px rgba(15,39,67,.10)` (dark `0 8px 24px rgba(0,0,0,.35)`) — sticky/popover. `--sh3 0 24px 56px rgba(15,39,67,.20)` (dark `0 24px 56px rgba(0,0,0,.55)`) — drawer/dialog. 카드에는 그림자를 쓰지 않고 1px border만 쓴다.
- Motion: 120–200ms, `transform`/`opacity`만. `transition: all` 금지. skeleton shimmer 1.3s linear, spinner 0.9s linear. `prefers-reduced-motion: reduce`에서 애니메이션 정지.
- Breakpoint: **1180px**(master-detail 2열→1열, 3열 grid→2열, 보조 컬럼 접힘), **1024px**(레일→모바일 헤더, 2열→1열), **640px**(모바일 밀도, 고가·저가 컬럼 접힘).
- z-index: sticky header 40, drawer overlay 60 / panel 61, dialog overlay 80 / panel 81, skip link 90.
- 최소 타깃: 모바일 인터랙티브 요소 44×44 CSS px. 데스크톱 보조 버튼은 최소 높이 32–36px 허용, 주요 액션은 40–44px.

## 7. Screens

### 7-1. App Shell

- `<a href="#main-content">본문으로 바로가기</a>` — `position:fixed; left:12px; top:-64px; z-index:90`, 포커스 시 `top:12px`. 배경 `--primary`, 텍스트 `--primary-fg`, radius 8px.
- 단일 `aria-live="polite"` 시각 숨김 region(1×1px, `clip`). 화면당 하나만 둔다. 라우트가 바뀌면 내용을 비운다(이전 발표가 남아 중복 낭독되는 것을 막는다).
- `<main id="main-content" tabIndex={-1}>`. 콘텐츠는 `max-width: 1280px`, 가운데 정렬.
- **URL 컨텍스트 스트립**(선택, 개발/QA에 유용): `--surface-2` 배경, mono 11.5px로 현재 `pathname + 계약 쿼리`를 표시. 프로덕션에서 뺄지 결정한다.
- 라우트가 바뀌면 `#page-title`로 포커스를 옮긴다: `el.focus({ preventScroll: true })` 후 `window.scrollTo(0, restoredY)`. **pathname만이 아니라 query 변화도 포함**해 키를 만든다. 프로그램적 포커스에서는 링이 보이지 않게 `h1[tabindex="-1"]:focus, main[tabindex="-1"]:focus { outline: none }`을 둔다(키보드 포커스 링은 `:focus-visible`로 유지).
- 프로토타입 구현 주의: `componentDidUpdate(prevProps, prevState)`의 이전 상태 비교가 아니라 인스턴스에 마지막 route 키를 저장해 비교했다. React 훅으로 옮길 때는 `useEffect`가 pathname+search 의존성을 갖게 하면 자연히 해결된다.

### 7-2. Latest (`/market/latest`)

첫 viewport 안에 **모드·기준일·freshness·상태·글로벌 헤드라인·양 시장 대표 변화**가 모두 들어간다. 단일 컬럼 스택으로 위에서 아래로 정독한다.

1. **결정 헤더 카드** (`--surface`, 1px `--line`, radius 12, 패딩 20)
   - 1행: 상태 배지 + `기준일` 라벨 + `businessDate`(mono 14px/600) + 구분선 + `생성` 라벨 + `generatedAt`(mono 12.5px) + `· 2시간 12분 전 생성` + (refetch 중이면) `갱신 중` 배지(spinner 9px)
   - h1 `최신 시장 브리프` (15px/600/`--text-faint`)
   - 글로벌 헤드라인 (26px/600). `globalHeadline`이 null이면: "글로벌 헤드라인이 생성되지 않았습니다. AI 요약 단계가 실패했을 수 있습니다 — 아래 상태와 배치 로그에서 원인을 확인하세요."
   - **시장 비교 스트립**: 2열 그리드(≤1024px 1열). 타일마다 `US`/`KR` 코드 라벨 + 시장명 + `섹션 이동` 버튼(스무스 스크롤, `scroll-margin-top:16px`) + 대표 지수명·종가(mono 21px/600)·등락·등락률 + 시장 요약 한 줄 + `지수 5종 · 이슈 4건`
   - 푸터 메타(mono 11.5px, `white-space:nowrap`): `원문 174건 → 정제 114건 → 클러스터 21건` / `pageId 501 · v3` / `마지막 갱신 …`
2. **PARTIAL 배너** — `status==='PARTIAL'`이거나 `partialMessage`가 있으면. 좌측 4px `--warning` 바. 제목 "이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다" + 누락 항목 `<ul>`(페이지 레벨 메시지 + 시장별 `metadata.partialMessage`를 `시장명 — 메시지`로) + "누락된 항목은 아래 해당 섹션에도 표시됩니다…" + `배치 운영에서 원인 보기` 버튼.
3. **시장 섹션** × `markets[]` (US → KR 순, DTO 순서 유지)
   - 헤더: `US` 코드 배지(mono 11px, 1px border) + h2 시장명(17px) + `— summaryTitle`(14px `--text-soft`) + 우측 mono 11.5px `원문 85건 · 정제 26건 · 클러스터 7건`
   - 시장별 누락 줄(있으면): `--warning-soft` 배경, `!` + **누락** + 메시지
   - 내러티브: `summaryBody` 16px/1.65. null이면 점선 박스 + "이 시장의 요약이 생성되지 않았습니다…"
   - 분석 2열: **배경**(`analysis.background[]` 불릿) / **핵심 테마**(`keyThemes[]` 칩) + **관전 포인트**(`outlook`)
   - **대표 지수 — 카드 대신 밀도 높은 표.** 컬럼: 지수(이름 + mono 코드 서브라인) / 종가 / 등락 / 등락률 / 고가 / 저가. 수치는 우측 정렬 mono tabular. 등락·등락률은 `--up`/`--down`. ≤640px에서 고가·저가 컬럼을 접고 **종가 셀 아래에 `고 5,499.80 · 저 5,455.22` 서브라인을 노출**한다(값이 사라지면 안 된다). 표는 `min-width:380px` + 래퍼 `overflow-x:auto`.
   - **핵심 이슈 — 카드 그리드 대신 행 리스트.** 행마다 좌측(제목 15px/600 링크, 요약 13.5px, 태그 칩, `대표 기사 · 매일경제 · 2026-07-26 23:15 KST`) / 우측(mono `기사 8건`, `이슈 상세` primary 버튼, `원문 ↗` 보조 버튼, `네이버 미러 ↗` 텍스트 링크). 우측 열 200px, ≤640px에서 1열로 접힘. 이슈가 없으면 "묶인 이슈가 없습니다…" 설명.
   - **근거 원문** (`articleLinks[]` — **현재 mapper가 버리고 있으므로 복원해야 함**): 기본 4건 + `전체 N건 보기` 토글(`aria-expanded`). 항목은 제목 링크 + mono 메타 + `미러 ↗`.
4. `markets`가 빈 배열이면 섹션 대신 점선 박스: 제목 "시장 섹션이 생성되지 않았습니다" + 원인(FAILED면 "이 날짜의 배치가 뉴스 수집 단계에서 실패해…", 아니면 "배치는 완료됐지만 시장 섹션이 비어 있습니다…") + `배치 상태 확인` / `다른 날짜 찾기`.

### 7-3. Archive Detail (`/market/archive/:businessDate`)

본문은 Latest와 동일 컴포넌트를 재사용한다. **차이는 상단 모드 밴드**다.

- `--warning-soft` 배경 + 1px `--warning-line` + 좌측 4px `--warning`, radius 12, 패딩 12/16.
- 좌: `아카이브 스냅샷`(11.5px/700/caps/`--warning`) + `businessDate`(mono 14px/600) + `pageId 501 · v3`(mono 12px).
- 우: `검색 결과로 돌아가기`(진입 시 필터 쿼리가 있을 때만) · `← 2026-07-05` · `2026-07-07 →`(미래면 disabled) · `최신 브리프`(primary).
- h1은 `2026-07-06 시장 브리프`.
- 인접 날짜 이동은 날짜 산술이다. 해당 날짜 스냅샷이 없으면 404 상태 화면을 보여준다(§13 D-05).

### 7-4. Archive Search (`/market/archive/search`)

- h1 `아카이브` + 설명 "기준일 범위와 생성 상태로 과거 스냅샷을 찾습니다. 결과를 열면 해당 날짜의 시장 브리프로 이동하고, 돌아올 때 필터·페이지·스크롤 위치가 복원됩니다."
- **필터 카드**: `필터` h2 + mono `적용됨 · 2026-07-13 ~ 2026-07-27 · 전체 상태` + (draft가 applied와 다르면) `적용 전 변경 있음` info 배지. 3열 grid(≤640 1열): 시작일 `<input type="date">`, 종료일, 생성 상태 `<select>`(전체 상태 / READY · 준비 완료 / PARTIAL · 부분 생성 / FAILED · 생성 실패). 입력 최소 높이 44px. 액션: `필터 적용`(primary 44px) · `초기화`.
  - **draft와 applied를 분리한다.** 입력만으로 URL이 바뀌지 않는다. `필터 적용`에서만 `navigate`한다.
  - 검증: 형식(`YYYY-MM-DD`), 미래 날짜("미래 날짜는 선택할 수 없습니다. 오늘(2026-07-27)까지 조회할 수 있습니다."), from > to("시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요."). 실패 시 URL 유지, `aria-invalid`, `aria-describedby`로 필드 아래 12px `--danger` 메시지, **첫 오류 필드로 포커스**, live region에 "필터를 적용하지 못했습니다. 입력 오류 1건을 확인해 주세요."
  - 성공 시 `page=1`로 리셋하고 live region에 "검색 결과 46건을 찾았습니다."를 **한 번만** 발표.
  - `초기화`는 기본 범위(최근 14일)와 `page=1`을 URL에 반영하고 "필터를 기본값으로 초기화했습니다."를 발표.
- **결과 카드**: 헤더에 `검색 결과` + mono 총건수(12.5px/600) + `21–40 / 46` + (refetch 중) `갱신 중` 배지.
- 표 컬럼: 기준일(mono 링크 + `pageId 481` 서브라인) / 글로벌 헤드라인(링크, `text-wrap:pretty`, `overflow-wrap:anywhere`, PARTIAL·FAILED면 사유 서브라인) / 상태 배지 / 생성 시각(mono, nowrap). `min-width:520px` + 래퍼 `overflow-x:auto`.
  - ≤1180px에서 **생성 시각 컬럼을 접고 헤드라인 셀 아래 `생성 2026-07-27 06:08 KST` 서브라인으로 노출**한다. `display:none`으로 숨기면 스크린리더에서도 사라지므로 금지.
  - FAILED 행은 좌측 3px `--danger` inset 강조. `headlineSummary`가 null이면 "헤드라인이 생성되지 않았습니다".
- **페이지네이션**: 이전 / 페이지 번호 5개 창(현재 페이지 활성) / 다음 + 우측 mono `2 / 3`. 버튼 최소 40×44px. 이동 시 "2페이지를 불러옵니다." 발표.
- 상태별: loading은 필터 카드를 유지하고 결과 영역에만 skeleton 행 + "결과를 불러오는 중입니다. 필터는 그대로 유지됩니다." / error는 필터 위에 `role="alert"` 카드 + `다시 시도` / 결과 0건은 "조건에 맞는 스냅샷이 없습니다" + 원인 설명 + `필터 초기화`.
- 행을 열 때 `?pageId=&from=&to=&status=&page=`를 함께 넘겨 복귀 문맥을 만든다.

### 7-5. Cluster Detail (`/market/cluster/:uuid`)

- breadcrumb `nav[aria-label="위치"]`: `origin=latest` → `최신 브리프 / 미국 증시 / 이슈 상세`, `origin=2026-07-06` → `아카이브 2026-07-06 / …`, origin 없음(직접 진입) → `시장 브리프 / …` + info 박스 "진입 경로 정보가 없어 이 이슈의 기준일(2026-07-26) 브리프로 돌아갑니다."
- 헤더 카드: 시장 배지 + `기준일` + businessDate + `기사 8건` + `갱신 …` / h1 = 이슈 제목(26px/600) / `summary.short` lead / 태그 칩 / 액션 `← 최신 브리프로 돌아가기`, `2026-07-26 시장 브리프 보기`
- 2열(1180px에서 1열): 본문(**AI 심층 분석** = `summary.long` 14px + `summary.analysis[]` 각 문단에 좌측 2px `--line-strong` 인용선 / **관련 기사** 10건 + `남은 40건 더 보기` 토글, 항목마다 제목 링크 + mono 메타 + `원문` 배지 + `네이버 미러 ↗`) / 우측 sticky aside(**대표 기사** 카드: caps 라벨, 제목 14.5px/600, mono 언론사·발행시각, `sourceSummary`, `원문 보기 ↗` primary + `네이버 미러 ↗`)
- **원문/미러 구분**을 문구로 명시한다. `naverLink`가 null인 항목이 있으므로 조건부 렌더가 필수다.
- sparse 대비: `summary.*`가 모두 null이면 "이 이슈의 심층 분석이 아직 생성되지 않았습니다…", 태그 0개면 칩 영역 생략, `publisherName`/`publishedAt` null은 "언론사 미확인"/"발행 시각 미확인".
- Back은 origin route로 돌아가고 **원점의 스크롤 위치를 복원**한다.

### 7-6. Batch Operations (`/ops/batches`)

Viewer면 권한 화면만 보여준다: `403 · FORBIDDEN` 배지 + h1 "이 화면에 접근할 권한이 없습니다" + "이 화면은 파이프라인 로그와 수동 실행을 포함하므로 Operator 권한이 있는 계정만 열 수 있습니다. 현재 계정은 Viewer입니다." + `최신 브리프로 이동`. 로그·Trigger·상세 노드는 **DOM에 렌더하지 않는다**(숨기기만으로는 부족).

Operator:

1. 헤더: h1 `배치 운영` + 설명 + 우측 `수동 실행` primary 버튼(`id="trigger-btn"`).
2. Trigger 성공 배너(성공 후): 좌측 3px `--success` + "실행을 시작했습니다" + mono `job 1043` + 상태 배지 + `기준일 … · 시작 …` + `작업 보기`.
3. **주의 배너**(failed+partial > 0): 좌측 3px `--danger` + "3건 실패, 3건 부분 실패 — 확인이 필요합니다." + `실패만 보기` / `부분 실패만 보기`(status 쿼리 설정, `page=1`).
4. **요약 타일 3개**(실패 → 부분 실패 → 성공 순, 3열/1180px에서 2열): caps 라벨 + mono 26px/600 숫자 + 보조 설명. 실패 타일 좌측 3px `--danger`, 부분 실패 `--warning`. 성공 타일에 `평균 소요 3분 10초`. **실패가 0이어도 화면 전체를 위험색으로 물들이지 않는다** — 강조는 좌측 바와 숫자 색까지만.
5. **Master-detail** (`--md: minmax(0,1fr) 400px`, ≤1180px 1열)
   - 목록: `실행 이력` + mono `1–20 / 27` + 적용된 상태 필터 + (필터 있으면) `필터 해제`. 표 컬럼: 작업·기준일(mono 날짜 버튼 + `job 1042 · pageId 501 · v3` 서브라인) / 상태 배지(+`partialMessage` 서브라인) / 소요(mono, 아래 시작 시각) / 원문·정제·이슈(mono). `min-width:480px` + `overflow-x:auto`. ≤1180px에서 마지막 컬럼을 접고 첫 셀 아래 `원문/정제/이슈 174 / 114 / 21` 서브라인으로 노출.
   - **선택/hover/focus/FAILED가 서로 구분되어야 한다**: 선택 = `background:--primary-soft` + `inset 3px 0 0 --primary`, FAILED = `inset 3px 0 0 --danger`, hover = `--surface-2`, focus = `:focus-visible` 링. 행 선택은 첫 셀의 버튼으로 하며 키보드로 접근 가능해야 한다.
   - 선택 시 `?jobId=` 쿼리를 쓴다(deep link + Back 복원). 좁은 폭에서는 `&view=detail`로 drill-in해 목록을 감추고 상세 헤더에 `← 목록` 버튼을 둔다.
   - 페이지네이션은 Archive와 동일 패턴. **이것이 현재 없는 기능이다.**
   - 목록 loading/error는 상세와 **독립**이다. 목록 오류 문구: "배치 목록을 불러오지 못했습니다. 필터와 이전 선택은 그대로 유지됩니다." + `목록 다시 시도`.
   - 상세 loading/error도 독립: `aria-busy` skeleton + "선택한 작업의 상세를 불러오는 중입니다. 목록과 필터는 유지됩니다." / "이 작업의 상세를 불러오지 못했습니다" + "목록은 정상입니다…" + `상세 다시 시도`.
6. **상세 패널**
   - 헤더: (좁은 폭) `← 목록` + h2 `job 1042` + 상태 배지 + mono 기준일
   - `<dl>` 2열: 시작 / 종료(없으면 "진행 중") / 소요 / 원문·정제·이슈 / 스냅샷(`pageId 501 · v3` 또는 "스냅샷 없음") / 실행 옵션(`force=false · rebuildPageOnly=false`)
   - **파이프라인 단계** `<ol>` — 제목 옆에 `PROPOSED · BACKEND` 배지. 단계마다 tone 도트(9px, `--tone` + 2px `--tone-soft` 링) + 단계명 + (있으면) tone 색 비고 + 우측 상태어/소요. 8단계는 백엔드 `app/batch/steps/` 모듈명 기준: 작업 생성 · 뉴스 수집 · 지수 수집 · 중복 제거 · 클러스터 구성 · AI 요약 생성 · 페이지 스냅샷 · 작업 종료. 실패 지점은 `FAILED`, 그 이후는 `SKIPPED`("이전 단계 실패로 건너뜀").
   - **사용자 영향** `<ul>`: 예) "미국·한국 시장 스냅샷 미생성", "2026-07-21 아카이브 항목 없음", "해당 날짜 클러스터 상세 진입 불가"
   - 오류 박스: `--danger-soft` 배경 + 좌측 3px + mono `NEWS_SOURCE_TIMEOUT` + `errorMessage`
   - **실행 로그**: `복사` 버튼 + `전체 4,079자 보기` 토글(`aria-expanded`). `<pre>`는 `max-height:240px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere`, `--surface-2` 배경, mono 11.5px. 가로 스크롤이 생기면 안 된다.
   - 액션: `2026-07-21 스냅샷 열기`(pageId 있을 때) · `같은 기준일 재실행` · mono `재실행 가능`/`재실행 불필요`

### 7-7. Manual Trigger (dialog)

`role="dialog" aria-modal="true" aria-labelledby`, `width:min(520px,94vw)`, `max-height:88vh`, `--sh3`, 오버레이 `rgba(8,17,31,.55)`.

- **열림**: 첫 입력(`#trigger-date`)으로 포커스. Escape·오버레이 클릭·`✕`·`취소`로 닫히고 `#trigger-btn`으로 포커스 복귀. 포커스 트랩 필요.
- **idle**: 설명 "기준일 하루치 뉴스·지수를 다시 수집하고 통합 페이지 스냅샷을 생성합니다. 같은 기준일 작업이 실행 중이면 요청은 거부됩니다." + `기준일 (KST)` date 입력 + `고급 옵션` 토글.
  - 고급 옵션(`--warning-soft` 박스): `force` 체크박스("이미 생성된 스냅샷이 있어도 새 versionNo로 다시 생성합니다. 기존 버전은 보존됩니다."), `rebuildPageOnly`("뉴스·지수를 재수집하지 않고 저장된 정제 결과로 페이지만 다시 만듭니다."), 하단 경고 "두 옵션의 실행 권한과 audit 정책은 백엔드 확인이 필요합니다 (D-11)."
  - 액션: `실행`(primary 44px) · `취소`
- **pending**: 폼을 진행 블록으로 **교체**한다(중복 제출이 구조적으로 불가). spinner + "실행 요청을 보내고 있습니다" + "응답이 올 때까지 다시 요청할 수 없습니다. 중복 실행은 발생하지 않습니다." live: "배치 실행을 요청하고 있습니다."
- **success**: `--success-soft` 박스 + `<dl>` 작업 ID(mono/600) · 상태 · 기준일 · 시작 시각 + `작업 상세 보기` / `닫기`. live: "job 1043 실행을 시작했습니다. 상태 실행 중." 닫으면 목록 상단에 성공 배너가 남고 배치 목록 쿼리를 invalidate한다.
- **error**: `role="alert"` + mono `409 · BATCH_ALREADY_RUNNING` + 메시지 + "입력값은 그대로 유지됩니다. 원인을 확인한 뒤 다시 시도할 수 있습니다." + `입력으로 돌아가기`(입력값 유지) + (409에 기존 jobId가 오면) `job 1042 열기` + `닫기`
  - 메시지: 409 "2026-07-27 배치가 이미 실행 중입니다." / 403 "수동 실행 권한이 없습니다. Operator 권한이 필요합니다." / 422 "미래 날짜는 실행할 수 없습니다."(`businessDate` 필드 표시) / 429 "요청이 너무 많습니다. 60초 후 다시 시도해 주세요." / 500 "배치 실행 요청을 처리하지 못했습니다." / 네트워크 "네트워크에 연결할 수 없습니다."

### 7-8. Auth Bootstrap · 404

`App.tsx`의 기존 3상태를 유지하되 시각 언어를 맞춘다. 셸 없이 중앙 정렬 카드(max-width 440px): tone 배지 + h1 + 설명 + (loading·redirecting) spinner + 액션.

- loading: `인증 확인 중` / "로그인 상태를 확인하고 있습니다" / "잠시만 기다려 주세요. 인증이 끝나면 최신 브리프가 열립니다." / `role="status" aria-live="polite"`
- redirecting: `로그인으로 이동` / "로그인 페이지로 이동 중입니다" / "자동으로 이동하지 않으면 새로고침 후 다시 시도해 주세요." / `role="status"`
- failed: `401 · AUTH_BOOTSTRAP_FAILED` / "로그인 상태를 확인할 수 없습니다" / "잠시 후 다시 시도하거나 로그인 페이지에서 다시 접속해 주세요. 인증이 끝나면 마지막으로 보던 화면으로 돌아옵니다." / `다시 시도` / `role="alert" aria-live="assertive"`

404: `404 · ROUTE_NOT_FOUND` 배지 + "이 주소에 해당하는 화면이 없습니다" + "주소가 바뀌었거나 잘못 입력됐을 수 있습니다. 최신 브리프에서 다시 시작하세요." + `최신 브리프로 이동`.

## 8. States

컴포넌트마다 `default / hover / focus-visible / active / disabled / loading / empty / partial / error / retrying / success`를 정의한다. 화면별 필수 등가군:

| 화면 | 상태 |
| --- | --- |
| Latest / Archive Detail | ready · refetching · 최초 loading skeleton · PARTIAL · FAILED · `markets:[]` · sparse(null·빈 배열 혼재) · 장문/무공백 200자 토큰 · 5xx · offline · malformed(`markets` 없음) · 401 · 429 · (Archive) 404 |
| Archive Search | 결과 20건 · loading(필터 유지) · refetching(이전 결과 유지) · 결과 0건 · 5xx(필터 유지 + 재시도) · 날짜 field validation · page 2 |
| Cluster | ready(기사 8건) · sparse(null 필드) · heavy(태그 20 · 기사 50) · 장문 + 긴 URL · 404 · loading · 5xx |
| Batch | ready(실패 우선 요약) · 목록 loading · 목록 error · 상세만 loading · 상세만 error · 4,000자 로그 · 결과 0건 · page 2 · Viewer 403 |
| Trigger | idle · confirm · pending · success · 409 · 403 · 422 · 429 · 5xx · network |
| System | auth loading/redirecting/failed · 404 |

**skeleton은 실제 레이아웃 골격을 유지한다**(중앙 메시지로 화면을 대체하지 않는다). 오류는 영향받는 영역 안에서만 나타나고 항상 복구 액션을 가진다. retrying은 해당 영역 progress + live "다시 불러오는 중입니다." → 성공 시 "데이터를 다시 불러왔습니다."

빈 상태 문구는 세 가지를 구분한다: 검색 결과 없음 / 생성된 데이터 없음 / 연결된 기사 없음.

## 9. Interaction Contracts

| 전환 | URL | Back | Scroll | Focus | Announce |
| --- | --- | --- | --- | --- | --- |
| primary route | pathname | 이전 route | 새 페이지 top | `#page-title` | — |
| Archive 필터 적용 | query 변경, `page=1` | 이전 필터 복원 | 결과 top | 결과 heading | "검색 결과 N건을 찾았습니다." |
| 필터 검증 실패 | **변경 없음** | — | 유지 | 첫 오류 필드 | "필터를 적용하지 못했습니다. 입력 오류 N건을…" |
| Archive pagination | `page` | 이전 page | 결과 top | 결과 heading | "N페이지를 불러옵니다." |
| Archive 행 열기 | `:date` + `pageId` + 필터 쿼리 | 검색 결과 복원 | **원래 스크롤 복원** | 상세 h1 | — |
| Cluster 진입 | `:uuid` + `origin` + 필터 쿼리 | 원점 route | 원점 스크롤 복원 | 상세 h1 | — |
| Batch 행 선택 | `jobId` (좁은 폭 `view=detail`) | 이전 선택 | 상세 가시 | 상세 heading | "job N 상세를 표시합니다." |
| 외부 원문 | 변경 없음, 새 탭 | 현재 유지 | 유지 | 복귀 시 기존 링크 | — |
| Retry | 유지 | — | 영향 영역 유지 | 성공 시 heading | "다시 불러오는 중입니다." → "…다시 불러왔습니다." |
| Trigger 성공 | 유지 | — | 유지 | 성공 heading 또는 `작업 상세 보기` | "job N 실행을 시작했습니다. 상태 …" |
| theme | URL 불필요 | — | 유지 | 토글 유지 | — |

스크롤 복원은 `navigate` 직전에 현재 URL 키로 `window.scrollY`를 저장하고, 복귀 시 해당 키의 값으로 되돌린다. 새 URL은 0으로 이동한다.

## 10. Role / Capability Map

| Capability | Viewer | Operator |
| --- | --- | --- |
| Latest · Archive · Cluster | ✅ | ✅ |
| 운영 메뉴 항목 렌더 | ❌ | ✅ |
| `/ops/batches` 진입 | 403 화면 | ✅ |
| 배치 목록·요약 | ❌ | ✅ |
| `errorMessage` · `logSummary` | ❌ | ✅ |
| Manual Trigger | ❌ | ✅ |
| `force` · `rebuildPageOnly` | ❌ | ✅ (§13 D-11) |

**[가정]** 역할 출처가 현재 없다. 프로토타입은 프런트 상태로 대체했다. 구현에서는 단일 지점(`src/lib/auth-*` 또는 새 `capabilities.ts`)에서 역할을 읽도록 만들고, 백엔드 계약이 생기면 그 지점만 교체할 수 있게 한다. 서버가 권한을 강제하기 전까지 프런트 게이팅은 **UX 장치일 뿐 보안 경계가 아니다**는 점을 코드 주석에 남긴다.

## 11. Responsive

| Width | 필수 |
| --- | --- |
| 320 | 최소 reflow, 모든 액션 접근 가능 |
| 390 | 주요 모바일 기준 |
| 768 | 모바일→태블릿 경계 |
| 1024 | 레일/헤더 경계 |
| 1280 | multi-column 데이터 경계 |
| 1440 | 기본 데스크톱 |

Pass 조건:

- **모든 폭에서 `document.documentElement.scrollWidth <= clientWidth`.** 데이터 테이블 내부의 의도된 scoped scroll은 허용, 문서 전체 가로 스크롤은 불허.
- 컬럼을 접을 때는 같은 값을 우선순위 행의 보조 줄로 노출한다. `display:none`으로 정보를 버리지 않는다.
- 모든 텍스트 블록에 `overflow-wrap:anywhere`, 모든 grid/flex 자식에 `min-width:0`.
- 200% 확대와 320 CSS px reflow에서 정보·행동 손실 없음.
- 중요한 액션이 overflow 컨테이너 끝에 숨지 않음.
- sticky 헤더가 포커스 타깃을 가리지 않음(`scroll-margin-top`).
- safe-area inset 고려.

## 12. Component Inventory (reuse / refactor / replace)

| 컴포넌트 | 현재 파일 | 판정 | 내용 |
| --- | --- | --- | --- |
| Button | `src/components/ui/button.tsx` | Reuse + 확장 | loading·danger variant, 44px 터치 사이즈 추가 |
| Input | `src/components/ui/input.tsx` | Refactor | invalid·describedby·help 텍스트 지원 |
| Select | `src/components/ui/select.tsx` | Reuse | Radix 유지, 터치 타깃만 확인 |
| Card | `src/components/ui/card.tsx` | Refactor | 반투명·그림자 제거, 1px border + `--surface` |
| Table | `src/components/ui/table.tsx` | Refactor | `min-width` + 래퍼 `overflow-x:auto`, 우선순위 컬럼 prop |
| AppShell | `src/components/app-shell.tsx` | **Replace** | 레일 단일 nav + compact header + drawer. topbar 검색·중복 링크·푸터 제거 |
| PageMessage | `src/components/ui.tsx` | **Replace** | `Skeleton` / `InlineAlert` / `EmptyState` / `PermissionState` 패밀리로 분리 |
| Status chip | `getStatusClass` (`app-state.ts`) | Refactor | 클래스 문자열 대신 `<StatusBadge status>` 컴포넌트(도트 + 한국어 상태어 + tone 토큰) |
| Index card | `market-overview-page.tsx` | **Replace** | 카드 그리드 → 밀도 높은 비교 표 |
| Cluster card | `market-overview-page.tsx` | Refactor | 행 리스트 + 대표 기사 메타 + 원문/미러 구분 |
| KPI stat card | `batch-operations-page.tsx` | Refactor | 실패 우선 3타일 |
| Filter bar | `archive-search/`, `batch-operations/` | Compose | 공용 `FilterBar` + draft/applied·검증 규칙 |
| Pagination | Archive만 존재 | Extend | 공용 `Pagination`(범위·번호창·announce), Batch에 적용 |
| Master-detail | `batch-operations-page.tsx` | Refactor | 반응형 drill-in |
| Log box | `batch-operations-page.tsx` | Refactor | pre-wrap + 높이 제한 + 복사 + 전체 보기 |
| Skeleton / InlineAlert / Toast / ConfirmDialog / Drawer / PermissionState | 없음 | **Add** | Drawer·Dialog는 포커스 트랩·Escape·복귀 필수 |
| Pipeline stages | 없음 | **Add** | `PROPOSED · BACKEND` 표시 |

## 13. Data Layer Work

**현재 mapper가 버리고 있어 복원해야 하는 DTO 필드** (`src/lib/mappers.ts`, `src/lib/view-models.ts` 확인 후 수정):

| DTO | 화면 용도 |
| --- | --- |
| `markets[].articleLinks[]` | 시장 섹션 "근거 원문" 목록 |
| `markets[].metadata.{rawNewsCount,processedNewsCount,clusterCount,lastUpdatedAt,partialMessage}` | 시장 헤더 카운트, 누락 표시 |
| `metadata.{rawNewsCount,processedNewsCount,clusterCount,lastUpdatedAt,isLatest}` | 헤더 신뢰 정보, 최신 여부 |
| `markets[].analysis.{background,keyThemes,outlook}` | 분석 3요소 |
| `topClusters[].representativeArticle` | 이슈 행의 대표 기사 메타 + 원문 링크 |
| `pageId` · `versionNo` | 아카이브 모드 밴드, 재현성 |
| Batch `pagination.{page,size,totalCount}` | **페이지네이션 (현재 UI 없음)** |
| Batch 상세 `errorCode` · `errorMessage` · `logSummary` · `forceRun` · `rebuildPageOnly` | 상세 패널 |

날짜/시간 정책: **모든 시각은 KST 절대시각 `YYYY-MM-DD HH:mm KST`**. `businessDate`는 KST 기준 날짜(백엔드 정책). freshness는 `generatedAt` 기준 상대 표현을 **보조로만** 병기한다. 숫자는 `ko-KR` 로케일, 소수 2자리 고정, 등락에 `+`/`-` 기호. `formatters.ts`의 기존 함수를 재사용하되 로케일·표기를 이 정책에 맞춘다.

## 14. Backend Dependencies · Open Decisions

`docs/design_v2/09-scope-traceability-decisions.md`의 결정 로그와 연결한다. **아래를 확정 요구사항처럼 다루지 말고, 되돌리기 쉬운 기본안 + 명시적 표시로 구현한다.**

| ID | 내용 | 프로토타입의 임시 결정 | 필요한 것 |
| --- | --- | --- | --- |
| D-01 | 단일 사용자 vs Viewer/Operator | 2단계 분리, 프런트 상태 | 권한 API / JWT claim |
| D-05 | Archive 인접 날짜 이동 | 날짜 산술 + 없으면 404 상태 | 존재하는 이전/다음 business date API |
| D-06 | 같은 날짜 복수 version | `pageId · vN` 표시, 최신 기본 | version 목록/선택 계약 |
| D-11 | Trigger 입력 범위 | `businessDate` 기본, force·rebuild는 고급 모드 | 옵션별 권한·audit 정책 |
| D-13 | PARTIAL 상세 범위 | 문자열 `partialMessage`를 상단 + 섹션에 표시 | 누락 섹션·원인 구조화 필드 |
| — | 파이프라인 단계 상태 | `app/batch/steps/` 모듈명 기준 8단계 가정, `PROPOSED · BACKEND` 배지 | 단계별 status·duration 필드 |
| — | 401 vs 403 | 세션 만료와 권한 없음을 다른 화면으로 | 오류 코드 구분 보장 |
| — | 409 payload | 기존 `jobId`가 오면 "실행 중 작업 열기" | 409 응답에 existing job 포함 |
| — | 자동 refresh | 미구현 | interval/SLA 정책 (D-16) |

**API 변경 없이 가능한 것**(v2 범위 전부): nav 통합, 반응형 구조, 모드 표시, Retry, 필터 유지, 모바일 테이블 재구성, `jobId` 쿼리, pageId/version 표시, skeleton, focus/scroll/live region, `articleLinks`·`metadata` mapper 연결, Trigger 성공 job ID 표시, Batch pagination.

## 15. Accessibility

- WCAG 2.2 AA. 본문 4.5:1, large text·UI 상태 3:1.
- 상태를 색만으로 전달하지 않는다(도트 + 상태어 + 영향 설명).
- 모바일 인터랙티브 타깃 44×44 CSS px, 인접 액션 간 간격 확보.
- icon-only 컨트롤에 accessible name, 장식 아이콘은 `aria-hidden`.
- landmark: `nav[aria-label="주요 메뉴"]`, `main#main-content`, 섹션마다 `aria-labelledby`. heading은 h1 → h2 → h3 순서로 건너뛰지 않는다.
- 화면당 **단일** `aria-live="polite"` region. 시각 텍스트와 중복 낭독되지 않게 하고 라우트 변경 시 비운다. 오류는 `role="alert"`.
- `:focus-visible`은 light/dark/forced-colors에서 모두 보이게. 프로그램적 heading 포커스에서는 링을 숨긴다.
- Dialog·Drawer: 포커스 트랩, Escape, 오버레이 클릭, 트리거 포커스 복귀, `overscroll-behavior:contain`.
- `prefers-reduced-motion: reduce`에서 위치 이동·장식 모션 제거. `forced-colors: active`에서 border를 `CanvasText`로.
- 모든 핵심 과업을 키보드만으로 완료할 수 있어야 한다.

## 16. Acceptance Criteria

Playwright(Mock API 라우팅)로 최소 아래를 assertion한다. `docs/design_v2/capture-screenshots.cjs`를 참고하되 **기존 증거 `docs/design_v2/screenshots/`는 덮어쓰지 않는다.** v2 캡처는 `docs/design_v2/v2-screenshots/`에 manifest(route·viewport·theme·role·fixture)와 함께 저장한다.

1. route·query 파싱: 6개 라우트 + 잘못된 날짜/UUID → 404
2. 필터 apply/reset: 적용 전 URL 불변, 적용 시 query + `page=1`, reset 시 기본 범위
3. 검증: 미래 날짜·역순·형식 오류 → URL 불변 + 필드 메시지 + 첫 오류 필드 포커스
4. pagination: Archive 46건/20 → 3페이지, Batch 27건/20 → 2페이지, `page` query 반영
5. browser Back: 필터·페이지·선택(`jobId`)·스크롤 복원
6. deep link: `?jobId=`, `?pageId=`, `origin=` 직접 진입
7. route focus: 이동 후 `document.activeElement` === `#page-title`
8. keyboard: Tab 순서, skip link 동작, Drawer/Dialog 포커스 트랩·Escape·복귀
9. Retry: 오류 → 재시도 → 성공, 오류 중 필터·이전 결과 유지
10. Trigger lifecycle: idle→pending→success/409/403/422/429/5xx, 중복 제출 불가, 실패 시 입력 유지
11. 권한: Viewer일 때 운영 nav·Trigger·로그 노드가 **DOM에 없음**, 직접 진입 시 403
12. live region: 결과 수·페이지 이동·retry·trigger 결과 문구
13. **6개 viewport 전부에서 `scrollWidth <= clientWidth`** (장문·200자 토큰·4,000자 로그 픽스처 포함)
14. console error 0, 예상하지 않은 실패 요청 0

프로토타입에서 실측한 결과(참고): 6 viewport × 13 route·state 조합 78건에서 문서 가로 오버플로 0건.

검증 명령(`AGENTS.md`):

```bash
pnpm test          # vitest run
pnpm build         # tsc -b && vite build  ← 유일한 typecheck
pnpm lint          # eslint .
pnpm run knip      # 기존 known issue와 신규 issue를 구분해 보고
npx @biomejs/biome check --write
```

기존 테스트(`app-shell.test.tsx`, `*-page.test.tsx`, `app-state.test.ts`, `router.test.ts`, `mappers.test.ts`, `query-hooks.test.tsx`)는 셸·페이지 구조 변경으로 깨질 수 있다. **삭제하지 말고** 새 구조에 맞게 갱신하고, 무엇을 왜 바꿨는지 남긴다.

## 17. Files in this bundle

| 파일 | 용도 |
| --- | --- |
| `Market Brief v2.dc.html` | 인터랙티브 디자인 레퍼런스. 브라우저에서 직접 열린다. 좌측 하단 "상태 시뮬레이터"로 모든 상태를 전환하고, `#/qa/states`에 상태 카탈로그와 변경 추적표가 있다 |
| `fixtures.js` | 상태 등가군 픽스처. **실제 DTO 계약을 그대로 따르므로 Playwright mock fixture의 출발점으로 쓸 수 있다** (`DailyPageResponse`, `ArchiveListResponse`, `ClusterDetailResponse`, `BatchJobListResponse`, `BatchJobDetailResponse`, `BatchRunResponse`) |
| `qa-viewports.html` | 반응형 오버플로 측정 하네스. 6 viewport × 상태 조합을 iframe으로 로드해 `scrollWidth - clientWidth`를 측정한다. 같은 아이디어를 Playwright로 옮기면 §16-13이 된다 |
| `CLAUDE_CODE_PROMPT.md` | Claude Code에 그대로 붙여넣는 작업 지시문 |

레퍼런스를 여는 방법: `Market Brief v2.dc.html`을 브라우저로 열고 URL 뒤에 `#/market/latest?mock=partial` 같은 해시를 붙인다. 사용 가능한 값은 `fixtures.js`와 `#/qa/states` 화면에 정리돼 있다.
