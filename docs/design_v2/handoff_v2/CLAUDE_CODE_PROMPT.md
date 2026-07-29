# Claude Code에 붙여넣을 프롬프트

아래 블록을 `stockfront` 저장소 루트에서 Claude Code에 그대로 붙여넣는다.
사전 준비: 이 핸드오프 폴더를 저장소 안(예: `docs/design_v2/handoff_v2/`)에 복사해 두면 Claude Code가 파일을 직접 읽을 수 있다.

---

```text
이 저장소(stockfront)의 Market Brief UI를 v2로 재구현한다.

## 먼저 읽을 것

1. docs/design_v2/handoff_v2/README.md  ← 이번 작업의 디자인 명세다. 토큰, 화면별 레이아웃, 상태, 인터랙션 계약, 컴포넌트 판정, 수용 기준이 모두 여기 있다.
2. AGENTS.md, package.json, src/main.tsx, src/App.tsx
3. src/lib/router.ts, src/lib/app-state.ts, src/lib/query-hooks.ts, src/lib/api/, src/lib/mappers.ts, src/lib/view-models.ts, src/lib/formatters.ts
4. src/app/, src/pages/, src/components/, src/styles/
5. docs/Product_Requirement_Document.md, docs/Information_Architecture.md, docs/UI_Requirement_Document.md
6. docs/design_v2/01-ia.md ~ 12-acceptance-validation-handoff.md, docs/design_v2/screenshots/ (현행 증거)

docs/design_v2/handoff_v2/ 안의 Market Brief v2.dc.html 은 디자인 레퍼런스 프로토타입이다. 코드를 복사하지 말고(인라인 스타일 + CSS 변수로 작성돼 있다) 의도한 레이아웃·상태·문구를 확인하는 용도로 읽는다. 실제 구현은 이 저장소의 React + Tailwind v4 + shadcn 컴포넌트 + 커스텀 라우터로 한다. 같은 폴더의 fixtures.js 는 실제 DTO 계약을 따르므로 Playwright mock fixture의 출발점으로 그대로 활용한다.

문서와 코드가 다르면 다음 우선순위로 판단하고 차이를 결정 로그에 남긴다: (1) 실제 실행 동작과 테스트 (2) 현재 API/DTO/View Model 계약 (3) 승인된 제품 요구사항 (4) design_v2의 개선 제안. 09-scope-traceability-decisions.md에서 Open / Proposed / BACKEND로 표시된 항목은 확정 요구사항으로 다루지 않는다. 가정이 필요하면 가장 되돌리기 쉬운 기본안을 고르고 가정·대안·백엔드 의존성을 명시한다. 백엔드 계약이 없는 기능을 가짜로 완성된 것처럼 만들지 말고 capability boundary와 상태 UI로 표현한다.

## 지켜야 할 제약

- Vite + React SPA 유지. Next.js, React Router 도입 금지.
- 라우팅은 src/lib/router.ts의 navigate / buildUrl / useUrlState, src/lib/app-state.ts의 parseRoute / parseListFilters 를 쓴다.
- /stock/ base path와 현재 URL 계약 유지. 유지할 라우트: /market/latest, /market/archive/search, /market/archive/:businessDate, /market/cluster/:uuid, /ops/batches, 404. / → /market/latest 리다이렉트 유지.
- 데이터 흐름은 React Query hook → src/lib/api/* → mappers → view-models 구조 유지.
- API/DTO 계약을 임의로 바꾸지 않는다. 필요한 백엔드 개선은 별도 목록으로 기록한다.
- VITE_API_HOST 검증과 development auth bypass 동작 유지.
- dark/light 테마 유지하고 README §6의 semantic token으로 교체한다.
- 기존 shadcn 설정과 src/components/ui/* 를 우선 활용한다. 새 의존성은 명백한 이점이 있을 때만 추가한다.
- pnpm 사용.
- 사용자의 미커밋 변경을 덮어쓰거나 무관한 파일을 정리하지 않는다.
- 정적 목업이나 별도 데모 앱을 만들지 말고 기존 애플리케이션을 개선한다.

## 작업 순서

각 단계가 끝나면 pnpm build 로 타입을 확인하고 다음으로 넘어간다. 한 번에 전부 고치려 하지 말고 단계별로 커밋 가능한 상태를 만든다.

1. 설계 정리 (짧게, 문서 작업으로 시간을 쓰지 말 것)
   - 현행 구조와 README 명세의 차이, 개선 IA와 role/capability map, 기존 컴포넌트의 reuse/refactor/replace 분류, Open decision과 backend dependency를 docs/design_v2/v2-decisions.md 에 정리한다.

2. Foundation
   - src/styles/base.css 의 :root 및 :root[data-theme="dark"] 를 README §6 값으로 교체한다. radial-gradient 배경과 반투명 surface를 제거하고 1px border + 단색 surface로 바꾼다.
   - typography / spacing / radius / shadow / motion / breakpoint(1180 / 1024 / 640) 토큰을 정의한다. 수치·ID·시각·로그에 mono + font-variant-numeric: tabular-nums 를 적용한다.
   - 폰트를 결정한다: 실제 asset을 추가해 Inter/Manrope 선언을 유효하게 만들거나, system stack으로 정직하게 정리한다. 선택과 이유를 기록한다.
   - :focus-visible 링, prefers-reduced-motion, forced-colors, color-scheme, theme-color 를 양 테마에 맞춘다. 테마 선택은 localStorage에 저장하고 없으면 시스템 설정을 따른다.
   - h1[tabindex="-1"]:focus, main[tabindex="-1"]:focus 의 outline을 없앤다(프로그램적 route focus에서 전폭 링이 보이지 않게).

3. 상태·공용 컴포넌트
   - src/components/ui.tsx 의 PageMessage 를 Skeleton / InlineAlert / EmptyState / PermissionState 패밀리로 교체한다.
   - StatusBadge(도트 + 한국어 상태어 + tone 토큰), FilterBar(draft/applied 분리 + 검증), Pagination(범위 + 번호창 + announce), Drawer, ConfirmDialog(포커스 트랩 · Escape · 트리거 포커스 복귀), LogBox(pre-wrap + 높이 제한 + 복사 + 전체 보기), PipelineStages 를 추가한다.
   - app-state.ts 의 getStatusClass 를 StatusBadge 로 대체한다. 상태를 색만으로 전달하지 않는다.
   - 화면당 단일 aria-live="polite" region을 두고 라우트 변경 시 비운다. 오류는 role="alert".

4. App Shell 교체 (src/components/app-shell.tsx)
   - 데스크톱 좌측 레일 248px에 primary navigation을 한 번만 둔다. 시장 인텔리전스 / 운영 두 그룹, 운영은 Operator에게만 렌더한다.
   - topbar의 중복 링크, 비활성 전역 검색, Support · Documentation · System Status · 푸터 링크를 제거한다.
   - ≤1024px에서 레일을 숨기고 compact header(44×44 메뉴 버튼 + 섹션/route 라벨 + 테마 토글) + drawer로 전환한다. drawer는 focus trap, Escape, 오버레이 클릭, 트리거 포커스 복귀를 갖고 browser Back을 가로채지 않는다.
   - skip link를 유지하고 라우트 이동 시 #page-title 로 focus({ preventScroll: true }) 한 뒤 스크롤을 처리한다. focus 키는 pathname 만이 아니라 search 까지 포함한다.

5. Data layer 복원 (src/lib/mappers.ts, view-models.ts)
   - 현재 매퍼가 버리는 DTO 필드를 View Model에 연결한다: markets[].articleLinks, markets[].metadata, 최상위 metadata(isLatest 포함), markets[].analysis(background/keyThemes/outlook), topClusters[].representativeArticle, pageId, versionNo, Batch pagination, Batch 상세 errorCode/errorMessage/logSummary/forceRun/rebuildPageOnly. README §13 표를 그대로 따른다.
   - 시각 표기를 KST 절대시각 "YYYY-MM-DD HH:mm KST" 로 통일하고 freshness 상대 표현은 보조로만 병기한다. 숫자는 ko-KR, 소수 2자리, 등락에 +/- 기호. formatters.ts 를 재사용한다.

6. 화면 구현 — README §7 순서대로
   - Latest: 결정 헤더(상태·기준일·생성 시각·freshness·헤드라인) + US/KR 비교 스트립 + PARTIAL 배너 + 시장 섹션(내러티브·분석 3요소·지수 비교 표·이슈 행 리스트·근거 원문). 지수 카드 그리드를 밀도 높은 표로 교체한다.
   - Archive Detail: Latest 본문을 재사용하고 상단에 아카이브 모드 밴드(경고 톤 · pageId · versionNo · 인접 날짜 · 검색 결과 복귀 · 최신 브리프)를 추가한다.
   - Archive Search: draft/applied 분리, field-level validation, URL 기반 필터·페이지, loading/error에서 필터와 이전 결과 유지, 20건 이상 pagination, 좁은 폭에서 컬럼을 접되 값은 보조 줄로 노출.
   - Cluster Detail: origin 쿼리로 breadcrumb·Back·스크롤 복원, 직접 진입 fallback, 원문/네이버 미러 구분, sparse·기사 50건·장문 대응.
   - Batch Operations: 실패 우선 요약, 데스크톱 master-detail + 모바일 drill-in, jobId 쿼리 deep link, 목록/상세 독립 loading·error, 파이프라인 단계(PROPOSED · BACKEND 표시), 사용자 영향, 4,000자 로그 처리, 관련 스냅샷 이동, 그리고 현재 없는 pagination 구현.
   - Manual Trigger: confirm → pending(중복 제출 불가) → success(job ID · 상태 · 시작 시각 · 작업 보기) / 409 · 403 · 422 · 429 · 5xx · network. 실패 시 입력 유지. 고급 옵션(force, rebuildPageOnly)은 분리하고 권한·audit 미확정을 명시한다.
   - Auth bootstrap 3상태와 404를 v2 시각 언어로 정리한다. App.tsx 의 role/aria-live 구분을 유지한다.

7. 권한
   - 역할을 한 지점에서 읽도록 만든다(src/lib/capabilities.ts 신설 권장). Viewer에게는 운영 메뉴·Trigger·로그 노드를 DOM에 렌더하지 않고, 직접 진입 시 403 화면으로 처리한다. 서버가 강제하기 전까지 프런트 게이팅은 보안 경계가 아니라는 주석을 남긴다.

8. 반응형
   - 320 / 390 / 768 / 1024 / 1280 / 1440 에서 document.documentElement.scrollWidth <= clientWidth 를 만족시킨다. 테이블 내부 scoped scroll만 허용한다.
   - 텍스트 블록에 overflow-wrap: anywhere, grid/flex 자식에 min-width: 0 을 적용한다. 로그는 pre-wrap + 높이 제한.
   - 컬럼을 접을 때 같은 값을 우선순위 행의 보조 줄로 노출한다. display:none 으로 정보를 버리지 않는다.

9. 테스트와 검증
   - 기존 테스트(app-shell.test.tsx, *-page.test.tsx, app-state.test.ts, router.test.ts, mappers.test.ts, query-hooks.test.tsx)를 삭제하지 말고 새 구조에 맞게 갱신한다. 무엇을 왜 바꿨는지 기록한다.
   - Playwright를 network routing 기반 Mock API로 설정한다. fixtures.js 의 등가군을 옮겨 쓴다. docs/design_v2/capture-screenshots.cjs 를 참고하되 docs/design_v2/screenshots/ 는 덮어쓰지 않는다.
   - README §16의 14개 항목을 assertion한다. 특히: route·query 파싱, 필터 apply/reset, pagination, browser Back과 deep link, scroll·focus 복원, 키보드와 dialog/drawer focus, Retry, Trigger lifecycle, 역할별 노출, live region 문구, 모든 viewport에서 가로 overflow 없음, console error 0.
   - v2 기준 스크린샷을 docs/design_v2/v2-screenshots/ 에 저장하고 각 파일의 route·viewport·theme·role·fixture를 manifest로 남긴다. 최소한 주요 화면의 desktop/mobile ready, 핵심 loading·error·partial·permission·trigger 상태, light/dark 대표 화면을 포함한다.
   - 다음을 실행하고 실패하면 원인을 해결한다:
       pnpm test
       pnpm build
       pnpm lint
       pnpm run knip        (기존 known issue와 새로 추가된 issue를 구분해 보고)
       npx @biomejs/biome check --write

## 최종 보고 형식

1. 사용자가 체감하는 가장 중요한 개선
2. 화면별 변경 사항
3. 재사용·교체한 컴포넌트와 디자인 시스템
4. 접근성·반응형·상태 처리 결과
5. Playwright 증거와 검증 명령 결과
6. 아직 제품 또는 백엔드 결정이 필요한 항목
7. 변경한 주요 파일 목록

작업 중 발견한 기존 결함을 숨기지 말되, 요청 범위와 무관한 대규모 리팩터링으로 확장하지 않는다.
```

---

## 이 프롬프트가 잘 동작하려면

Claude Code는 프로토타입을 **실행해 보지 못한다**. 파일을 읽을 수는 있지만 렌더 결과는 볼 수 없다. 그래서 시각 정보는 README가 전부 싣고 있어야 한다. 다음 두 가지를 함께 주면 결과가 크게 좋아진다.

1. **핸드오프 폴더를 저장소 안에 복사**한다. 예: `docs/design_v2/handoff_v2/`. 프롬프트의 경로가 그 위치를 가정한다.
2. **레퍼런스 스크린샷을 함께 넣는다.** 필요하면 요청하면 주요 화면(desktop/mobile × light/dark × 핵심 상태)을 PNG로 뽑아 `handoff_v2/screenshots/`에 넣어 준다. Claude Code는 이미지도 읽을 수 있으므로 밀도·정렬 판단에 도움이 된다.

## 한 번에 다 시키지 않는 편이 낫다

위 프롬프트는 전체 범위다. 실제로는 단계를 쪼개는 쪽이 결과가 안정적이다. 권장 분할:

| 세션 | 범위 | 프롬프트 |
| --- | --- | --- |
| 1 | Foundation + App Shell | 위 프롬프트의 "먼저 읽을 것", "지켜야 할 제약", 작업 순서 1–4 |
| 2 | Data layer + Latest + Archive Detail | 5–6 중 Latest·Archive Detail |
| 3 | Archive Search + Cluster | 6 중 해당 화면 |
| 4 | Batch + Trigger + 권한 | 6 중 Batch·Trigger, 7 |
| 5 | 반응형 + 테스트 + Playwright | 8–9 |

각 세션 끝에 `pnpm build`와 `pnpm test`를 통과시키고 커밋한다. 세션마다 README의 해당 절만 다시 읽게 하면 컨텍스트도 절약된다.
