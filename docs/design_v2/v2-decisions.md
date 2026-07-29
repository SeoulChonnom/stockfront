# v2 결정 로그

`docs/design_v2/handoff_v2/README.md`(v2 명세)와 현재 저장소 구현을 대조해 확정한 결정 기록이다. `09-scope-traceability-decisions.md`의 Open/Proposed/BACKEND 항목은 확정 요구사항이 아니라는 전제를 유지한다. 코드 인용은 실제 읽은 라인 기준이다.

## 1. 현행 구조 vs README v2 명세 — 차이 표

| 영역 | 현행 | v2 명세 | 갭 | 담당 단계 |
| --- | --- | --- | --- | --- |
| Shell/Nav | `app-shell.tsx` 좌측 sidebar(272px, `base.css:28`) + **topbar에 동일 3개 링크 중복**(`app-shell.tsx:117-156`) + Coming soon 2건(`:92-101`, `:195-198`) + footer(`:190-200`). ≤980px에서 sidebar가 `static`으로 본문 위에 쌓임(`responsive.css:21-27`), 모바일 전용 헤더/드로어 없음 | 단일 nav 레일, topbar 제거, drawer, Coming soon/footer 삭제(§5) | 이중 nav, 모바일 드로어 부재, Coming soon 잔존 | P2 |
| Tokens/Theming | `base.css` `--surface: rgba(255,255,255,.78)`(`:4`, dark `:54`) + `radial-gradient` 배경(`:39-45`, dark `:74-80`). `--up`/`--down`/`--info`/`--neutral`/`--focus` 토큰 없음. `--font-sans: Inter,...`/`--font-display: Manrope,...` 선언(`:31-36`)만 있고 실제 폰트 asset 없음 | 불투명 surface, gradient 제거, 확장 상태색 팔레트(§6) | 토큰 이름·값 전면 재정의 필요, 폰트 결정 필요 | P1 |
| 상태 컴포넌트 | `PageMessage`(`ui.tsx:21-38`) 하나로 loading/error/empty 전부 처리. skeleton 없음(중앙 텍스트로 화면 대체), retry 버튼 없음, `ariaLive`/`role`는 optional prop이라 대부분 호출부에서 미지정 | Skeleton/InlineAlert/EmptyState/PermissionState 분리(§8, §12) | 레이아웃 골격 유지 skeleton 없음, 복구 액션 없음, live region 일관성 없음 | P3 |
| Data layer | `mapDailyPageToSnapshot`(`mappers.ts:141-195`)가 `articleLinks`, market/page `metadata`, `analysis.outlook` 등을 버림. Batch 상세 `errorCode`/`forceRun`/`rebuildPageOnly` 미매핑 | §13 전체 필드 복원 | 상세 §4 참조 | P4 |
| Latest (`/market/latest`) | 카드 그리드(`IndexCard`, `market-overview-page.tsx:121-161`) + 카드 그리드(`ClusterPreviewCard`, `:163-216`). PARTIAL 배너 없음, 근거 원문 없음(데이터 자체가 없음), 대표 기사 메타 없음 | 밀도 테이블 + 행 리스트 + PARTIAL 배너 + 근거 원문(§7-2) | 시각 구조 전면 교체, 데이터 의존(P4 선행 필요) | P5 |
| Archive Detail | Latest와 동일 컴포넌트 재사용(맞음, `market-overview-route-content.tsx`), 단 아카이브 모드 밴드 없음, 인접 날짜 이동 없음, pageId/version 미노출 | 경고색 모드 밴드 + 인접 날짜 네비 + pageId·v표기(§7-3) | 모드 밴드 컴포넌트 전무 | P5 |
| Archive Search | `ArchiveSearchFilters`(draft/applied 분리는 이미 존재, `:27-35`)에 **검증 로직 없음**(형식/미래날짜/역순 미검사), `page size=4`(`archive-search-page.tsx:34`, 스펙 함의는 20), pagination은 Prev/Next뿐 5-페이지 창 없음(`archive-pagination.tsx`) | 검증+포커스+live region, size 20, 5-페이지 창(§7-4) | 검증 계층 전체 신규, size 값 정정 | P6 |
| Cluster Detail | breadcrumb이 정적 span(`cluster-detail-page.tsx:71-77`), origin 쿼리 없음, Back이 `/market/archive/search`로 하드코딩(`:222`), 스크롤 복원 없음 | origin 인지 breadcrumb + 스크롤 복원(§7-5) | origin 상태 설계 전체 신규 | P7 |
| Batch(`/ops/batches`) | 권한 분기 전무(Viewer 화면 없음), pagination UI 전무(footer는 텍스트뿐, `batch-operations-footer.tsx`), master-detail은 CSS grid뿐 drill-in 없음, log box는 `<pre>` 아닌 일반 div(`batch-run-detail-panel.tsx:38-40`), 파이프라인 단계 없음 | 403 화면, pagination, drill-in, `<pre>` 로그, 8단계(§7-6) | 화면 전면 재작업, capabilities.ts 선행 필요 | P8 |
| Manual Trigger | 다이얼로그 없음. `onTrigger`가 `startBatchMutation.mutate()`(`batch-operations-summary.tsx:33`) → `startBatchRun({})`(`query-hooks.ts:104`) 즉시 POST. businessDate/force/rebuildPageOnly 입력 UI 없음(단, API 타입은 이미 지원, `types.ts:186-190`) | idle→pending→success/409/403/422/429/5xx 다이얼로그(§7-7) | UI 전체 신규, API 변경 불필요 | P8 |
| Auth/404 | 401/redirecting/failed 3상태는 있음(`App.tsx:22-50`)이나 상태 배지·`role="alert"` 구분이 부족. `NotFoundPage`(`not-found-page.tsx`)에 `404 · ROUTE_NOT_FOUND` 배지 없음, 영어 카피 | 배지+한국어 카피(§7-8) | 카피/배지만 교체, 로직 변경 없음 | P9 |
| Responsive | breakpoint가 1180/980/720(`responsive.css`)로 스펙의 1180/1024/640과 다름. 320px reflow 미검증 | 1180/1024/640 3단(§6, §11) | breakpoint 값 재정의 + 실측 필요 | P9 |
| A11y | `#page-title` id는 이미 4개 페이지에 존재(`market-overview-page.tsx:41`, `cluster-detail-page.tsx:78`, `archive-search-page.tsx:90`, `batch-operations-summary.tsx:22`) — App.tsx 포커스 로직과 이미 맞음. 단일 `aria-live` region 없음(컴포넌트별 산발적), skip link는 있으나 focus 시각 확인 안 됨 | 화면당 단일 live region, 라우트 변경 시 비움(§7-1, §15) | live region 통합 신규 | P2, P9 |
| Permissions | role 개념이 코드 전체에 0건(grep 확인). `UserRdo`(`auth-bootstrap.ts:19-21`)는 `accessToken`만 가짐 | Viewer/Operator capability map(§10) | `capabilities.ts` 신규 + 전 화면 게이팅 | P2 (스텁), P8 (소비) |
| 라우트 계약(정합성 확인) | `app-state.ts:26-28`의 `archiveMarketRoutePattern`(`\d{4}-\d{2}-\d{2}`)·`clusterDetailRoutePattern`(UUID v4)이 README §4가 요구하는 정규식과 **완전히 일치**. `withBasePath`/`buildUrl`(`router.ts:28-34,127-134`)도 계약대로 동작 | 라우트·정규식 그대로 유지(§4) | **갭 없음** — 재작업 불필요, 실수로 건드리지 않도록 명시 | — |

## 2. 개선 IA + Role/Capability Map

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

단일 진실 공급원: **`src/lib/capabilities.ts`(신규)**. `getCurrentRole()` 하나만 노출하고, 다른 모든 모듈은 이 함수만 참조한다. 백엔드 계약이 생기면 이 파일 내부 구현만 교체한다.

| Capability | Viewer | Operator | 게이팅 지점(파일) |
| --- | --- | --- | --- |
| Latest·Archive·Cluster 열람 | ✅ | ✅ | 게이팅 없음(공개) |
| 운영 nav 항목 렌더 | ❌ | ✅ | `app-shell.tsx` `navItems` 배열 — 조건부 filter 추가 |
| `/ops/batches` 진입 | 403 화면 | ✅ | `app-page-content.tsx` `'batch-ops'` case → `capabilities.ts` 체크 후 `PermissionState` 또는 `BatchOperationsPage` 분기 |
| 배치 목록·요약·상세 fetch | ❌ | ✅ | `query-hooks.ts`의 `useBatchJobs`/`useBatchJobDetail` `enabled` 플래그에 role 포함(불필요 네트워크 호출 방지, 보안 경계 아님) |
| `errorMessage`·`logSummary` 표시 | ❌ | ✅ | `batch-run-detail-panel.tsx` 렌더 분기 |
| Manual Trigger 버튼·다이얼로그 | ❌ | ✅ | `batch-operations-summary.tsx` 버튼 렌더 자체를 제거(DOM 미포함, `disabled`만으로 부족) |
| `force`·`rebuildPageOnly` 고급 옵션 | ❌ | ✅ (D-11 확정 전까지 Operator 전체 허용) | 신규 Trigger 다이얼로그 컴포넌트 |

`capabilities.ts`의 예상 형태(구현 스텁, 백엔드 계약 확정 전):

```ts
export type Role = 'viewer' | 'operator';

// SECURITY: front-end gating only. The server does not yet enforce roles;
// this file controls UX visibility, not access control. Do not treat any
// check below as a security boundary.
export function getCurrentRole(): Role {
  // D-01: role 출처 없음 — 임시로 로컬 상수/개발 토글을 사용한다.
  return 'operator';
}

export function canAccessOps(role: Role = getCurrentRole()): boolean {
  return role === 'operator';
}
```

**명시 사항**: 서버가 권한을 강제하기 전까지 프런트 게이팅은 **UX 장치일 뿐 보안 경계가 아니다**. `capabilities.ts` 파일 상단에 이 문구를 주석으로 고정한다. API 401/403 응답은 여전히 별도로 처리해야 하며, 프런트 게이팅이 이를 대체하지 않는다.

## 3. 컴포넌트 판정 (README §12 대조 검증)

| 컴포넌트 | 파일(검증됨) | README 판정 | 검증 결과 | 변경 내용 |
| --- | --- | --- | --- | --- |
| Button | `src/components/ui/button.tsx` | Reuse+확장 | **일치**. `size:'default'`가 이미 `min-h-11`(44px, `:20`), icon도 `size-11`(`:23`) | `danger` variant, `loading` prop(spinner+`aria-busy`) 추가만 하면 됨 |
| Input | `src/components/ui/input.tsx` | Refactor | **일치**. invalid 스타일·describedby 연결 없음(`:11-19`) | `aria-invalid` 스타일, helper/error 텍스트 슬롯 추가 |
| Select | `src/components/ui/select.tsx` | Reuse | **일치**. `SelectTrigger`가 `min-h-11`(`:27`)로 이미 44px. 단, `SelectItem`은 `py-2`(`:79-82`, 실측 약 36px)로 트리거보다 낮음 | 변경 없음(트리거), item 높이는 README가 트리거만 요구하므로 현행 유지하되 QA에서 실측 확인 |
| Card | `src/components/ui/card.tsx` | Refactor | **일치**. `bg-[var(--surface)]`(반투명)+`shadow-[var(--shadow-md)]`+`backdrop-blur-[18px]`(`:9`) 모두 제거 대상 | 반투명·blur·shadow 제거, 1px border만 유지 |
| Table | `src/components/ui/table.tsx` | Refactor | **일치**. `min-width`/래퍼 없음. 현재는 페이지마다 `.table-wrap` div를 개별 작성(`batch-operations-history-table.tsx:58`) | `min-width` prop + 내장 wrapper, 우선순위 컬럼 prop 추가 |
| AppShell | `src/components/app-shell.tsx` | Replace | **일치** | §1 참조 |
| PageMessage | `src/components/ui.tsx` | Replace | **일치** | §1 참조 |
| Status chip | `getStatusClass`(`app-state.ts:105-117`) | Refactor→StatusBadge | **일치**, 추가로 발견: 현재 상태어가 영문 그대로 노출(`READY`/`PARTIAL` 등), README §6의 한국어 상태어 매핑이 코드 어디에도 없음 | 도트+한국어 상태어(`준비 완료` 등) 매핑 테이블 신규 작성 필요 |
| Index card | `market-overview-page.tsx:121-161`(`IndexCard`) | Replace→표 | **일치** | §1 참조 |
| Cluster card | `market-overview-page.tsx:163-216`(`ClusterPreviewCard`) | Refactor→행 리스트 | **일치하나 더 큼**: 대표 기사 메타가 뷰모델에 아예 없어(§4) 데이터 레이어 작업(P4) 선행 필수 | 행 리스트 + 원문/미러 링크(P4 완료 후) |
| KPI stat card | README 표기: `batch-operations-page.tsx` | Refactor | **파일 경로 정정**: 실제 구현은 `batch-operations-summary.tsx:68-91`(`StatCard`). 현재 순서는 성공→평균→품질(실패 우선 아님) | 실패→부분실패→성공 순 재배치 |
| Filter bar | `archive-search/`, `batch-operations/` | Compose 공용 | **일치**, 검증 로직은 양쪽 다 0건 | 공용 `FilterBar` + 검증 규칙(P6에서 Archive 우선 구현 후 Batch 적용) |
| Pagination | Archive만 존재 | Extend 공용 | **일치**, 추가로 발견: 현재 Archive pagination도 스펙 미달(5-페이지 창 없음, `archive-pagination.tsx` 전체) | 공용 `Pagination`(범위+번호창+announce) 신규, Archive/Batch 공용화 |
| Master-detail | `batch-operations-page.tsx` | Refactor drill-in | **일치**. `.ops-grid`는 CSS grid뿐(`responsive.css`), `view=detail` 쿼리·`← 목록` 없음 | 반응형 drill-in 신규 |
| Log box | README 표기: `batch-operations-page.tsx` | Refactor | **파일 경로 정정**: 실제 구현은 `batch-run-detail-panel.tsx:38-40`. `<pre>` 아닌 일반 `<div className='log-box'>`, 복사·전체보기 없음 | `<pre>` + max-height + 복사 + 토글 |
| Skeleton/InlineAlert/Toast/ConfirmDialog/Drawer/PermissionState | 없음 | Add | **일치**, grep 결과 0건 | 신규 작성 |
| Pipeline stages | 없음 | Add | **일치**, 추가로 발견: `BatchJobDetailResponse` DTO 자체에 단계별 필드 없음(`types.ts:154-173`) | UI 신규 + `PROPOSED · BACKEND` 배지 필수(§6) |

## 4. Data Layer 복원 목록 (README §13 대조)

판정 기준: **(a)** DTO 타입에는 있는데 mapper가 버림 · **(b)** DTO 타입 자체에 없음(백엔드 의존) · **(c)** 이미 매핑됨(작업 불필요, UI 노출만 남음).

| DTO 필드 | 타입 위치 | mapper 위치 | 판정 |
| --- | --- | --- | --- |
| `markets[].articleLinks[]` | `types.ts:46` (`MarketSectionResponse.articleLinks`) | `mappers.ts:141-195` — market 객체 생성 시 미참조 | **(a)** 복원 필요 |
| `markets[].metadata.*`(count/lastUpdatedAt/partialMessage) | `types.ts:47-53` | 동일 — `market.metadata` 미참조 | **(a)** 복원 필요 |
| `response.metadata.*`(rawNewsCount 등, 페이지 레벨) | `types.ts:26-31` | `mapDailyPageToSnapshot`에서 `response.metadata` 미참조 | **(a)** 복원 필요 |
| `response.metadata.isLatest` | **타입에 없음**(`types.ts:26-31` 확인, `isLatest` 필드 자체가 `DailyPageResponse['metadata']`에 없음). fixtures.js에는 존재(`fixtures.js:191` 등) | 해당 없음 | **(b)** 백엔드 확인 필요 — 실제 API가 내려주는지 미확인 상태로 타입 추가 금지 |
| `response.partialMessage`(페이지 레벨) | `types.ts:24` | 미참조 | **(a)** 복원 필요 |
| `markets[].analysis.background[]` | `types.ts:39-43` | `mappers.ts:161-162` — 읽지만 `summaryBody` 폴백 문자열 생성에만 사용, 구조화된 필드로 노출 안 됨 | **(a)** 구조화 복원 필요 |
| `markets[].analysis.keyThemes[]` | 동일 | `:161`, `:169` — `summaryTitle` 폴백에만 사용 | **(a)** 구조화 복원 필요 |
| `markets[].analysis.outlook` | `types.ts:42` | **전혀 참조되지 않음** | **(a)** 완전 누락, 복원 필요 |
| `topClusters[].representativeArticle.*` | `types.ts:75-81`(`RepresentativeArticleResponse`) | `mappers.ts:177-187` — `representativeArticle.title`만 클러스터 요약 폴백으로 사용, publisherName/publishedAt/originLink/naverLink 미매핑, `ClusterCard` 타입(`view-models.ts:13-19`)에 필드 자체가 없음 | **(a)** 타입 확장 + 복원 필요 |
| `pageId` / `versionNo`(Daily Page) | `types.ts:17-19` | `mappers.ts:147,149` — **이미 `MarketSnapshot`에 매핑됨**(`view-models.ts:22-23`) | **(c)** 데이터 작업 불필요, 화면에 노출만 안 됨(P5에서 UI만 추가) |
| Batch `pagination.{page,size,totalCount}` | `types.ts:10-14` | `mappers.ts:341-350` — **이미 `BatchJobsView`에 매핑됨**(`view-models.ts:101-108`) | **(c)** 데이터 작업 불필요, UI(pagination 컴포넌트)만 없음(P8) |
| Batch 상세 `errorCode` | `types.ts:170` | **전혀 참조되지 않음** | **(a)** 복원 필요, `BatchRun`과 분리된 detail 전용 타입 필요(§7 A-07) |
| Batch 상세 `errorMessage` | `types.ts:171` | `mappers.ts:373-375` — `detail` 폴백 체인에 합쳐짐, 독립 필드 아님 | **(a)** 구조화 복원 필요 |
| Batch 상세 `logSummary` | `types.ts:172` | `mappers.ts:372` — 동일하게 `detail`에 합쳐짐 | **(a)** 구조화 복원 필요 |
| Batch 상세 `forceRun` | `types.ts:159` | **전혀 참조되지 않음** | **(a)** 복원 필요 |
| Batch 상세 `rebuildPageOnly` | `types.ts:160` | **전혀 참조되지 않음** | **(a)** 복원 필요 |

날짜/시간·숫자 포맷 정책(§13 하단)은 `formatters.ts`가 이미 `ko-KR` 로케일과 `+`/`-` 부호(`formatSignedNumber`)를 구현 중이나, 시각 표기가 `KST` 접미사 없이 로컬 `Intl.DateTimeFormat` 결과만 반환한다(`formatDateTime`/`formatTime`, `formatters.ts:1-39`). "KST" 리터럴 접미사 부착은 P4/P5에서 추가한다.

## 5. 문서/코드 충돌 결정 로그

조정 우선순위: (1) 실제 실행 동작·테스트 > (2) 현재 API/DTO/View Model 계약 > (3) 승인된 제품 요구사항 > (4) design_v2 개선 제안.

| 항목 | 문서 주장 | 코드 실제 | 채택 | 근거 |
| --- | --- | --- | --- | --- |
| `metadata.isLatest` | README §13, fixtures.js가 필드 존재를 전제 | `types.ts` `DailyPageResponse['metadata']`에 필드 없음(§4 확인) | 필드 없는 것으로 간주, mode prop(`latest`/`archive`)과 route로 "최신 여부" 판단하는 기존 로직 유지 | (2) 현재 DTO 계약 |
| pageId/versionNo "복원 필요" | README §13이 데이터 레이어 작업 항목으로 나열 | 이미 `mappers.ts:147,149`에서 매핑 완료(§4 (c)) | 데이터 작업 없음, UI 노출만 P5에서 추가 | (2) 현재 DTO/VM 계약 — 문서가 부정확했음 |
| Batch pagination "현재 UI 없음" | README §13·09-decisions 동일 주장 | 데이터(`page/size/totalCount/totalPages`)는 이미 `view-models.ts:101-108`에 있음, UI만 없음(`batch-operations-footer.tsx`가 텍스트만 렌더) | 문서 주장 유지하되 "데이터는 있고 UI만 없다"로 범위 한정 | (1) 실제 코드 동작 확인 |
| KPI/Log box 파일 경로 | README §12가 `batch-operations-page.tsx`로 표기 | 실제 구현은 각각 `batch-operations-summary.tsx`, `batch-run-detail-panel.tsx`(하위 분리 컴포넌트) | 코드 실제 경로로 판정표 정정(§3) | (1) 실제 파일 구조 |
| Archive 페이지 크기 | README 승인 기준(§16-4) "46건/20 → 3페이지" | `archive-search-page.tsx:34`에서 `size: 4`로 요청 중, Batch는 `size: 20`(`batch-operations-page.tsx:43`) | Archive도 20으로 통일(P6에서 수정) | (3) 승인된 acceptance criteria |
| Primary nav 위치 결정 상태 | `09-scope-traceability-decisions.md` D-02가 "Design"(미확정) 상태로 남아 있음 | README §5가 이미 좌측 레일 단일 nav로 확정(픽셀·breakpoint까지 명시) | README 채택 | (4) design_v2 개선 제안이 09-decisions보다 최신이며 fidelity 확정 문서 |
| 인증 토큰 엔드포인트(참고용, v2 범위 밖) | `AGENTS.md:20`이 `${VITE_API_HOST}/api/user/token`(단수)로 기술 | `auth-config.ts:56`은 `${host}/api/users/token`(복수). 최근 커밋(`fcdef25 fix: slcnapp 인증 호출 경로 수정`)이 코드를 바꾼 것으로 보임 | 코드(실제 실행 동작) 채택. `AGENTS.md`는 이번 작업 대상 파일이 아니므로 여기서는 수정하지 않고 기록만 남김 | (1) 실제 실행 동작 — v2 화면 작업과 무관하므로 별도 이슈로 후속 처리 권장 |

## 6. Open Decisions / Backend Dependencies

**아래는 확정 요구사항이 아니다. 완성된 기능처럼 위장하지 않는다** — 되돌리기 쉬운 기본안 + 명시적 UI 표시(capability boundary, `PROPOSED · BACKEND` 배지, 또는 상태 UI)로만 구현한다.

| ID | 내용 | 채택할 기본안 | 대안 | 백엔드에 필요한 것 | UI 표시 |
| --- | --- | --- | --- | --- | --- |
| D-01 | Viewer/Operator 역할 출처 없음 | `capabilities.ts`에 로컬 상수(개발 빌드 토글) | 역할 게이팅 자체를 없애고 전원 Operator로 취급 | JWT role claim 또는 `/api/user/me` | 코드 주석 "UX only, not a security boundary" 고정, 배지 없음(항상 필요한 경계이므로) |
| D-05 | Archive 인접 날짜 이동 | 날짜 산술(±1일) 낙관적 링크, 없으면 404 상태 화면 | 존재 스냅샷 목록 API로 실제 이동 가능일만 활성화 | 존재 business date 조회 API | 상태 UI(404 화면)로 실패 표현, 배지 불필요 |
| D-06 | 동일 날짜 복수 version | `pageId` 우선 조회(기존 구현 유지) + `v{versionNo}` mono 표기만 | version 선택 드롭다운 | version 목록/선택 API | 단일 버전만 표시, "다른 버전" UI 없음 명시 |
| D-11 | Trigger `force`/`rebuildPageOnly` 권한 | 고급 옵션 토글 뒤에 Operator 전체 허용 | Operator 내 세부 권한(예: Admin만 force) | 옵션별 권한·audit 정책 | 고급 옵션 박스에 `PROPOSED · BACKEND` 배지(README가 이미 문구 명시) |
| D-13 | PARTIAL 상세 범위 | 문자열 `partialMessage`를 상단 배너+섹션에 그대로 노출 | 백엔드가 missing-section 구조화 필드 제공 시 세분화 | 구조화된 partial 원인 필드 | 배지 없음(현재도 실제 데이터), 구조화되면 즉시 교체 가능하게 컴포넌트 분리 |
| 파이프라인 8단계 | 상태·소요 필드가 DTO에 없음(`BatchJobDetailResponse`, §4) | 단계명은 `app/batch/steps/` 모듈명 가정으로 하드코딩, 상태는 표시하지 않음 | v2 최초 릴리스에서 단계 UI 자체 제외 | 단계별 status/duration 필드 | `PROPOSED · BACKEND` 배지 필수, tone 색 미사용 |
| 401 vs 403 구분 | `client.ts:82-98`이 401만 특별 처리, 403은 일반 오류로 흘러감 | status 코드 기반 분기 추가(401→재인증 유도, 403→PermissionState) | 서버가 오류 코드 body를 항상 포함하도록 계약 강화 | 일관된 오류 코드 필드 보장 | 상태 코드 기반 분기는 지금도 가능, 문구 정확도만 백엔드 의존 |
| 409 payload | 현재 Trigger 자체가 없어 409 처리 없음 | body에 existing jobId 없다고 가정, "목록에서 확인" 버튼만 제공 | 백엔드가 409 body에 existing job 필드 포함 | 409에 existing job 필드 | 조건부 렌더(있으면 "job N 열기" 버튼 추가, 없으면 생략) |
| 자동 refresh | 미구현 | 수동 refetch 버튼만 제공, interval 없음 | 고정 interval(예: 30초) 폴링 도입 | SLA/interval 정책(D-16) | "자동 갱신 없음" 상태로 유지, Could 항목 |

## 7. 가정 목록

| ID | 가정 | 되돌리기 비용 | 대안 |
| --- | --- | --- | --- |
| A-01 | 역할은 `capabilities.ts`의 로컬 상수/개발 토글로 시뮬레이션한다 | 낮음(파일 1개 교체) | 백엔드 role 확정 전까지 게이팅 자체를 제거 |
| A-02 | Archive/Batch pagination 기본 size를 20으로 통일한다(현재 Archive는 4) | 낮음(쿼리 파라미터 값) | size를 URL 쿼리로 노출해 사용자가 조정 |
| A-03 | 파이프라인 8단계 이름은 README가 추정한 `app/batch/steps/` 모듈명을 그대로 차용한다 | 중간(텍스트+구조 변경) | 백엔드 확정 전까지 단계 UI 자체를 숨김 |
| A-04 | 폰트는 system stack으로 확정한다(Inter/Manrope 미적용, §8 참조) | 낮음(토큰 값 교체) | 추후 자산 추가 시 self-host로 전환 |
| A-05 | URL 컨텍스트 스트립(§7-1 "선택")은 프로덕션에서 제외하고 개발 빌드에만 노출한다 | 낮음(env 플래그) | 항상 노출 |
| A-06 | 409 응답에 existing jobId가 없을 수 있다고 가정하고 옵션 처리한다 | 낮음 | 백엔드 계약 확정 후 필수 필드로 강화 |
| A-07 | Batch 상세 전용 필드(`errorCode`/`forceRun`/`rebuildPageOnly`/`logSummary`)를 위해 `BatchRun`과 분리된 `BatchRunDetail` 타입을 신설한다(현재 목록/상세가 같은 `BatchRun` 타입을 재사용 중) | 중간(타입+매퍼+컴포넌트 시그니처 변경) | 기존 단일 타입 유지하고 필드만 추가(당장은 쉬우나 목록/상세 의미 혼재 지속) |
| A-08 | `capabilities.ts`는 UX 게이팅뿐 아니라 `query-hooks.ts`의 `enabled` 플래그에도 참여해 Viewer의 불필요한 네트워크 호출을 막는다(보안 경계 아님, 방어적 조치일 뿐) | 낮음 | fetch는 그대로 두고 렌더만 막기 |

## 8. 폰트 결정

**검증**: `src/assets/`(hero.png, react.svg, vite.svg), `public/`(icons.svg, favicon.svg) 어디에도 폰트 파일 없음. `index.html`에 `@font-face`, Google Fonts `<link>`, preload 없음(전체 내용 확인 완료, 6줄 `<head>`). `base.css:31-36`은 `--font-sans: Inter, ...`/`--font-display: Manrope, ...`를 선언하지만 실제로는 시스템에 Inter/Manrope가 설치돼 있지 않은 한 즉시 폴백 스택(`ui-sans-serif, system-ui, ...`)으로 렌더링된다 — **선언과 실제 렌더링이 다르다**.

**결정: (b) system stack으로 정직하게 정리**. 이유:
1. 저장소에 폰트 asset이 없고, 빌드 시 네트워크 요청(Google Fonts 등)을 추가하는 것은 오프라인 빌드·라이선스 확인 이슈를 만든다.
2. FOUT/FOIT 회피 — 어차피 로드되지 않는 폰트명을 선언해 두는 것은 `--font-sans`/`--font-display` 토큰의 의미를 거짓으로 만든다(CLAUDE.md "Verify reality, not declarations" 원칙과 직접 충돌).
3. Display/Sans를 구분할 실제 폰트 차이가 없으므로 두 토큰을 유지하되 동일한 system 스택을 가리키게 한다.

**적용할 선언** (`src/styles/base.css` 교체 대상):

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

수치·ID·시각·로그 전용 유틸리티(신규):

```css
.mono-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

지수·금액·jobId·pageId·시각·카운트·로그 전체에 `.mono-num`(또는 동등 Tailwind arbitrary property)을 적용한다.

## 9. 단계별 실행 계획 요약

| Phase | 범위 | 주요 파일(충돌 방지용 소유권) | 선행 조건 |
| --- | --- | --- | --- |
| P1 | 토큰/테마 — 색·타이포·spacing·shadow·z-index 재정의, 폰트 결정 반영 | `src/styles/base.css`, `src/styles/*.css`(토큰 참조만) | 없음(가장 먼저) |
| P2 | App Shell — 단일 nav 레일, topbar 제거, 모바일 compact header + drawer, skip link, 단일 live region 스텁, `capabilities.ts` 신규(스텁) | `src/components/app-shell.tsx`, `src/styles/app-shell.css`, `src/App.tsx`(live region 위치), `src/lib/capabilities.ts`(신규) | P1 |
| P3 | 공용 상태/UI 컴포넌트 — Skeleton/InlineAlert/EmptyState/PermissionState/StatusBadge/Pagination/FilterBar, `ui/button.tsx`·`input.tsx`·`card.tsx`·`table.tsx` 리팩터 | `src/components/ui.tsx`(분리), `src/components/ui/*.tsx`, `src/lib/app-state.ts`(`getStatusClass` 교체) | P1 |
| P4 | Data layer 복원 — `articleLinks`/`metadata`/`analysis`/`representativeArticle`/Batch 상세 필드, `BatchRunDetail` 타입 신설(A-07) | `src/lib/mappers.ts`, `src/lib/view-models.ts`, `src/lib/formatters.ts`(KST 접미사), 관련 `*.test.ts` | 없음(P1~P3과 병렬 가능) |
| P5 | Latest / Archive Detail 화면 — 비교 스트립, 지수 표, 이슈 행 리스트, PARTIAL 배너, 아카이브 모드 밴드 | `src/pages/market-overview-page.tsx`, `src/app/market-overview-route-content.tsx`, 신규 `src/pages/market-overview/*.tsx` | P3, P4 |
| P6 | Archive Search 화면 — 검증 계층, live region, 5-페이지 창, size=20 정정 | `src/pages/archive-search-page.tsx`, `src/pages/archive-search/*.tsx` | P3, P4 |
| P7 | Cluster Detail 화면 — origin 인지 breadcrumb, 스크롤/포커스 복원 | `src/pages/cluster-detail-page.tsx`, `src/lib/router.ts`(스크롤 복원 헬퍼), `src/lib/app-state.ts`(origin 파싱) | P3, P4 |
| P8 | Batch Operations + Manual Trigger — 403 화면, pagination, drill-in, `<pre>` 로그, 파이프라인 단계, Trigger 다이얼로그 | `src/pages/batch-operations-page.tsx`, `src/pages/batch-operations/*.tsx`, 신규 `trigger-dialog.tsx`, `src/lib/query-hooks.ts`(mutation payload) | P2(`capabilities.ts`), P3, P4 |
| P9 | A11y/반응형 마감 + 검증 — breakpoint 1180/1024/640 정정, reduced-motion/forced-colors, 404/Auth 카피, Playwright v2 캡처 | `src/App.tsx`, `src/styles/responsive.css`, `src/pages/not-found-page.tsx`, 전 `*.test.tsx` 갱신, `docs/design_v2/v2-screenshots/`(신규) | P1~P8 전체 |

P4는 P1~P3과 파일이 겹치지 않으므로 병렬 진행 가능하다. P5~P8은 화면별로 파일이 분리돼 병렬 가능하나 전부 P3(공용 컴포넌트)·P4(데이터)를 선행 조건으로 한다. P9은 전체 통합 이후 단독 실행한다.

**충돌 주의 지점**:
- P2와 P3는 둘 다 `src/components/ui.tsx`/`app-shell.tsx` 인근을 건드릴 수 있다 — P2가 먼저 shell 골격을 확정한 뒤 P3가 `PageMessage` 분리를 진행한다(동시 착수 금지).
- 각 화면 phase(P5~P8)는 자기 화면의 기존 `*.test.tsx`만 갱신한다(예: P5는 `market-overview-page.test.tsx`만). 전체 스위트에 걸친 a11y·포커스 회귀 테스트는 P9에서 한 번에 정리해 중복 수정 충돌을 막는다.
- `src/lib/mappers.test.ts`·`query-hooks.test.tsx`는 P4 소유이며, 다른 phase가 view-model 필드를 임의로 추가하지 않는다.

## 부록: 검증 방법

이 문서의 모든 갭·판정·필드 상태는 추측이 아니라 아래 방식으로 직접 확인했다.

- **읽은 파일**: `handoff_v2/README.md` 전체, `09-scope-traceability-decisions.md` 전체, `AGENTS.md`, `App.tsx`/`main.tsx`/`app-shell.tsx`/`ui.tsx`/`ui/*.tsx`(5개), `router.ts`/`app-state.ts`/`query-hooks.ts`/`mappers.ts`/`view-models.ts`/`formatters.ts`/`auth-bootstrap.ts`/`auth-config.ts`/`api/client.ts`/`api/{archive,batch,news,pages}.ts`, `app/*.ts(x)`(3개), `pages/**`(전체 페이지+하위 컴포넌트, 약 15개 파일), `styles/*.css`(5개), `index.html`.
- **grep으로 존재 여부를 직접 확인한 항목**: `page-title` id(4개 파일에서 발견), `aria-live`(1건만 발견), `operator|viewer|capabilit`(0건), `40[139]` 상태 코드 처리(client.ts 401만), `drawer|dialog`(0건), `font-sans|font-display|Inter|Manrope|@font-face`(선언은 있으나 asset 없음), `isLatest`(types.ts 0건, fixtures.js에는 존재).
- **디렉터리 확인**: `.codegraph/` 없음(CodeGraph 미색인, 이번 조사는 Read/Grep으로 직접 수행), `src/assets/`·`public/`에 폰트 파일 없음.
- 이 조사 세션 중 저장소에 `index.html`/`package.json`/`src/App.tsx`/`src/lib/api/types.ts`/`src/lib/formatters.ts`/`src/lib/mappers.ts`/`src/lib/mappers.test.ts`/`src/lib/view-models.ts`/`src/styles/base.css`/`src/styles/responsive.css`/`pnpm-lock.yaml`에 대한 **커밋되지 않은 변경**과 신규 `src/lib/theme.ts`가 관찰됐다. 이 문서를 작성한 세션에서 발생시킨 변경이 아니며(`Edit`/`Write` 호출 대상이 본 파일 하나뿐이었음을 `git diff --stat`로 확인), `.sisyphus/run-continuation/*.json`의 존재로 미루어 동시에 실행 중인 별도 세션의 작업으로 추정된다. 이 문서는 해당 변경 사항을 반영하지 않았으므로, 병합 전 반드시 재대조가 필요하다.
