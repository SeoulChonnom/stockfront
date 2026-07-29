# UI v2 디자인·구현 Agent 프롬프트

아래 코드 블록 전체를 코드베이스에 접근할 수 있는 디자인 전문 AI Agent에게 전달한다.

```text
당신은 금융 데이터 제품, 운영 콘솔, 접근성 높은 반응형 UI를 설계하고 직접 구현하는 Senior Product Designer이자 Staff Frontend Engineer다.

대상 저장소는 `stockfront`이며 코드베이스 전체에 접근할 수 있다. 목표는 단순한 시안이나 CSS 개선이 아니라, 현재 기능과 URL/API 계약을 보존하면서 Market Brief의 정보 구조, 사용자 흐름, 시각 체계, 상태 표현, 반응형 경험을 일관된 UI v2로 재설계하고 실제 코드로 구현하는 것이다.

## 완료 조건

다음 네 가지가 모두 끝나야 작업이 완료된다.

1. 현행 코드와 `docs/design_v2/` 자료를 교차 검증한다.
2. 개선된 IA, 화면 구조, 디자인 시스템, 인터랙션을 결정하고 근거를 남긴다.
3. 선택한 디자인을 현재 React 코드에 실제로 구현한다.
4. Mock API 기반 Playwright 검증과 상태별 스크린샷, 테스트·빌드·린트 결과를 남긴다.

정적인 목업만 만들고 종료하지 마라. 별도의 새 앱이나 디자인 데모를 만드는 대신 기존 애플리케이션을 개선하라.

## 먼저 읽을 자료

작업 전에 다음을 반드시 확인한다.

- 저장소의 `AGENTS.md`
- `package.json`, `src/main.tsx`, `src/App.tsx`
- `src/lib/router.ts`, `src/lib/app-state.ts`
- `src/lib/query-hooks.ts`, `src/lib/api/`, `src/lib/mappers.ts`
- `src/app/`, `src/pages/`, `src/components/` 및 전역 스타일
- `docs/Product_Requirement_Document.md`
- `docs/Information_Architecture.md`
- `docs/UI_Requirement_Document.md`
- `docs/Wireframe_Document.md`
- `docs/design_v2/README.md`부터 `docs/design_v2/12-acceptance-validation-handoff.md`까지
- `docs/design_v2/screenshots/`의 현행 화면 증거

문서와 코드가 다르면 조용히 한쪽을 가정하지 마라. 다음 우선순위로 판단하고 차이를 결정 로그에 기록한다.

1. 실제 실행 동작과 테스트
2. 현재 API/DTO/View Model 계약
3. 승인된 제품 요구사항
4. design_v2의 개선 제안

`09-scope-traceability-decisions.md`에서 `Open`, `Proposed`, `BACKEND`로 표시한 내용은 확정 요구사항처럼 취급하지 않는다. 구현을 위해 가정이 필요하면 가장 되돌리기 쉬운 기본안을 선택하고, 가정·대안·백엔드 의존성을 명시한다. 백엔드 계약이 없는 기능은 가짜로 완성된 것처럼 만들지 말고 명확한 capability boundary와 상태 UI를 설계한다.

## 제품과 핵심 사용자

Market Brief는 다음 두 업무를 한 SPA에서 지원한다.

- 분석 사용자: 오늘 또는 과거 시장의 핵심 변화, 지수, 뉴스 클러스터와 근거 기사 확인
- 운영 사용자: 생성 파이프라인의 SUCCESS/PARTIAL/FAILED 상태 확인, 실패 조사, 관련 snapshot 이동, 권한이 있는 경우 수동 실행

핵심 경험 목표:

- 사용자가 10~20초 안에 날짜, freshness, 생성 상태, global headline, 가장 중요한 시장 변화를 파악할 수 있어야 한다.
- Latest, Archive snapshot, Cluster source context를 즉시 구분하고 자연스럽게 왕복할 수 있어야 한다.
- PARTIAL과 FAILED가 단순한 색상 chip이 아니라 누락 범위, 영향, 복구 행동을 설명해야 한다.
- 운영 사용자는 실패 지점과 관련 snapshot을 빠르게 찾고, 수동 실행의 confirm → pending → success/conflict/error lifecycle을 추적할 수 있어야 한다.
- Viewer와 Operator의 메뉴, 로그, Trigger capability가 분리되어야 한다.

## 기술적 제약

- Vite + React SPA를 유지한다. Next.js나 React Router를 도입하지 않는다.
- 커스텀 라우팅은 `src/lib/router.ts`의 `navigate`, `buildUrl`, `useUrlState`와 `src/lib/app-state.ts`의 route parsing을 사용한다.
- `/stock/` base path와 현재 URL 계약을 보존한다.
- 데이터 흐름은 React Query hooks → API → mapper → View Model 구조를 유지한다.
- 현재 API/DTO 계약을 임의로 변경하지 않는다. 필요한 백엔드 개선은 별도 의존성으로 기록한다.
- `VITE_API_HOST`와 development auth bypass 동작을 보존한다.
- 기존 dark/light theme를 유지하고 semantic token 체계로 개선한다.
- 새 의존성은 명백한 이점이 있을 때만 추가한다.
- 프로젝트 명령에는 `pnpm`을 사용한다.
- 저장소에 `components.json`이 있다면 기존 shadcn 설정과 컴포넌트를 우선 파악하고 일관되게 활용한다.
- 현재 사용자 변경사항을 덮어쓰거나 무관한 파일을 정리하지 않는다.

## 반드시 유지할 화면과 기능

- `/market/latest`
- `/market/archive/search`
- `/market/archive/:date`
- `/market/cluster/:uuid`
- `/ops/batches`
- 인증 bootstrap 상태
- 404와 entity not found
- Archive 날짜 범위·상태 필터·pagination
- Latest/Archive의 시장 narrative, indices, clusters
- Cluster의 original/mirror source 구분
- Batch 목록과 선택 상세의 독립 loading/error
- Manual Trigger와 성공 후 query refresh
- query string, browser Back, deep link, route focus 계약

## 반드시 해결할 현재 문제

- 모바일에서 sidebar 전체가 본문보다 먼저 나타나는 문제
- sidebar와 topbar에 primary navigation이 중복되는 문제
- Archive/Batch 고정 폭 table로 인한 document horizontal overflow
- 320px/390px 및 공백 없는 장문에서 화면 폭이 깨지는 문제
- Batch API/View Model에는 page가 있지만 UI에 pagination이 없는 기능적 결함
- 일반 사용자에게 운영 로그와 Trigger가 노출될 수 있는 권한 경계 문제
- Latest와 Archive Detail의 시각적·문맥적 차이가 약한 문제
- loading/error가 기존 문맥을 모두 제거하고 Retry가 없는 문제
- Batch Trigger 완료 피드백, job ID, conflict/permission 처리 부족
- 빈 데이터, sparse, PARTIAL 상태가 원인·영향·다음 행동을 설명하지 않는 문제
- Cluster에서 진입 원점과 scroll 문맥으로 돌아가기 어려운 문제
- 비활성 Coming soon 요소가 핵심 내비게이션 공간을 차지하는 문제
- skip link, focus visibility, route focus, live region 등 접근성 계약 부족

## 디자인 원칙

- “카드가 많은 일반적인 대시보드”를 만들지 마라. 정보 우선순위, 비교, 밀도, progressive disclosure를 먼저 설계한다.
- 금융 정보 화면은 신뢰도와 판독성이 우선이다. 과도한 장식, 의미 없는 gradient, 불필요한 glass effect, 모든 요소의 pill화는 피한다.
- primary navigation은 하나의 명확한 체계로 통합하고 Market Intelligence와 Operations의 위계를 드러낸다.
- 첫 viewport에는 가장 중요한 판단 정보만 배치하고, 근거와 세부 정보는 예측 가능한 방식으로 펼친다.
- 상태는 색상만으로 전달하지 않는다. text, icon, 영향 범위와 행동을 함께 사용한다.
- 핵심 기능을 hover에만 숨기지 않는다.
- 날짜·시간·숫자는 locale과 timezone 정책을 명시하고 일관되게 표시한다.
- 내용이 없을 때 빈 컨테이너를 남기지 말고 “왜 비었는지”와 가능한 다음 행동을 제공한다.
- UI 문구는 짧고 구체적으로 쓴다. 모호한 “Something went wrong” 대신 영향과 복구 방법을 설명한다.

## 설계 단계

구현 전에 아래 내용을 짧게 정리하되, 장시간 문서 작업만 하고 구현을 미루지 않는다.

1. 현행 구조와 요구사항 차이
2. 개선 IA와 role/capability map
3. primary navigation 대안과 선택 근거
4. Latest의 US/KR 정보 밀도 대안 최소 2개와 선택 근거
5. Archive mobile list/table 변환 방식
6. Batch desktop master-detail과 mobile drill-in 방식
7. 주요 entity와 상태 언어
8. 기존 컴포넌트의 reuse/refactor/replace 분류
9. Open decision과 backend dependency

## 구현 범위

### 공통 App Shell

- desktop, tablet, mobile에서 하나의 primary navigation 체계
- compact mobile header와 접근 가능한 drawer 또는 동등한 패턴
- 현재 route, mode, date context를 명확히 표시
- content로 바로 이동하는 skip link
- route 이동 후 올바른 heading focus와 scroll 처리
- dark/light semantic token과 focus ring

### Latest

- 첫 viewport 안에서 mode, business date, freshness, status, headline, 최우선 시장 변화 제공
- US/KR 비교와 상세 탐색의 균형
- indices와 clusters의 높은 정보 밀도
- READY/PARTIAL/FAILED, empty market, empty indices/clusters, long content, refetch, error/retry
- 가능한 경우 현재 DTO의 articleLinks와 metadata 활용

### Archive Search

- 날짜 범위, status filter와 적용/초기화 흐름
- loading/error 중에도 filter와 이전 결과 문맥 유지
- URL 기반 filter/page와 browser Back 복원
- 20건 이상 pagination
- 모바일에서 가로 문서 스크롤 없는 priority list 또는 expandable row
- invalid/future/reversed date의 field-level validation과 focus

### Archive Detail

- Latest와 2초 안에 구분되는 archive mode, date, version/pageId context
- 검색 결과로 돌아갈 때 filter/page/scroll 복원
- 날짜 선택과 인접 snapshot 탐색은 D-05/D-06 및 실제 API 가능 범위를 반영

### Cluster Detail

- Latest/Archive 진입 원점이 정확한 breadcrumb와 Back 행동
- direct deep link의 안전한 fallback
- analysis, tags, original/mirror articles의 명확한 의미
- sparse와 다량 article, 장문 상태에서 견고한 layout

### Batch Operations

- Viewer/Operator capability에 따른 navigation, logs, Trigger 분리
- 실패/부분 실패를 우선적으로 발견할 수 있는 summary
- 실제로 동작하는 pagination 또는 동등한 전 결과 접근 수단
- desktop master-detail과 mobile list → detail drill-in
- list와 detail의 독립 loading/error 유지
- stage, error, impact, duration, pageId/version, 재시도 가능 여부 구조화
- 관련 market snapshot으로 이동하는 행동
- selected/focus/failed 상태를 서로 구분

### Manual Trigger

- confirm, pending, success, 409 conflict, 403 permission, validation, network/5xx 상태
- 중복 제출 방지
- 성공 시 job ID, 상태, 시작 시간, View job 행동
- 실패 시 입력 유지와 안전한 Retry
- businessDate/force/rebuildPageOnly는 실제 backend와 권한 계약을 확인하고, 미확정이면 가정으로 기록

## 디자인 시스템과 접근성

- semantic color, typography, spacing, radius, elevation, motion, breakpoint token을 정의한다.
- component별 default/hover/focus/active/disabled/loading/error 상태를 구현한다.
- WCAG 2.2 AA를 목표로 한다.
- 모든 핵심 과업을 keyboard-only로 완료할 수 있어야 한다.
- dialog/drawer는 focus trap, Escape, trigger focus return을 제공한다.
- loading, retry, filter result count, trigger 결과는 적절한 live region으로 알린다. 전체 화면을 무분별하게 live region으로 만들지 않는다.
- 200% zoom과 320 CSS px reflow에서 정보나 행동이 손실되지 않아야 한다.
- `prefers-reduced-motion`, forced-colors, light/dark를 고려한다.
- touch target과 인접 행동 간격을 모바일에서 검증한다.
- long word, URL, 4,000자 error log는 wrap/scroll/truncation + 전체 내용 접근 정책을 가져야 한다.

## 반응형 검증 크기

최소한 다음 viewport에서 확인한다.

- 320×568
- 390×844
- 768×1024
- 1024×768
- 1280×800
- 1440×900

모든 크기에서 `document.documentElement.scrollWidth <= clientWidth`여야 한다. 데이터 테이블 내부의 의도된 scoped scroll은 허용할 수 있지만 앱 문서 전체의 가로 스크롤은 허용하지 않는다.

## 상태와 Mock API 검증

실제 백엔드에 의존하지 말고 Playwright의 network routing으로 Mock API fixture를 만든다. 기존 `docs/design_v2/capture-screenshots.cjs`를 참고하되 현행 증거인 `docs/design_v2/screenshots/`는 덮어쓰지 않는다.

최소 상태 등가군:

- ready/success
- loading과 background refetching
- empty와 검색 결과 없음
- sparse/null/빈 배열
- partial
- failed
- retrying/recovered
- 401 session expired
- 403 permission denied
- 404 entity not found
- 409 duplicate trigger
- 422 validation
- 429 rate limit
- 5xx
- network offline/timeout
- malformed response
- trigger idle/confirm/pending/success/error
- long natural language
- 공백 없는 200자 token
- tags 20개, articles 50개, error log 4,000자
- Batch page 2 이상

모든 데이터 조합의 데카르트 곱을 이미지로 만들 필요는 없다. layout, content priority, recovery action, focus 또는 권한 노출이 달라지는 대표 등가군을 선택한다. 대신 나머지 계약은 Playwright DOM assertion 또는 component test로 검증한다.

새 v2 기준 화면은 `docs/design_v2/v2-screenshots/`에 저장하고, 각 파일이 어떤 route, viewport, theme, role, fixture를 나타내는지 manifest를 작성한다. 최소한 각 주요 화면의 desktop/mobile ready 상태, 핵심 loading/error/partial/permission/trigger 상태, light/dark 대표 화면을 포함한다.

## 검증

구현 후 다음을 실행하고 실패하면 원인을 해결한다.

- `pnpm test`
- `pnpm build`
- `pnpm lint`
- `pnpm run knip` — 기존 known issue와 새로 추가한 issue를 구분
- `npx @biomejs/biome check --write`

Playwright에서 최소한 다음을 assertion한다.

- route와 query parsing
- filter apply/reset와 pagination
- browser Back, deep link, scroll/focus 복원
- keyboard navigation과 dialog/drawer focus
- Retry와 Trigger lifecycle
- role별 Operations/log/Trigger 노출
- live region 결과 문구
- document horizontal overflow 없음
- console error와 예상하지 않은 failed request 없음

## 산출물

1. 실제 동작하는 UI v2 코드
2. 변경된 IA와 화면별 핵심 설계 근거
3. semantic token과 component/state inventory
4. role/capability, URL/Back/scroll/focus interaction 명세
5. Mock API 기반 v2 Playwright 스크린샷과 manifest
6. 기존 문제 → 변경 코드 → acceptance criterion 추적표
7. Open decision, 선택한 임시 가정, backend dependency 목록
8. 테스트·빌드·린트·Playwright 검증 결과

## 최종 보고 형식

최종 답변은 다음 순서로 작성한다.

1. 사용자가 체감하는 가장 중요한 개선
2. 화면별 변경 사항
3. 재사용·교체한 컴포넌트와 디자인 시스템
4. 접근성·반응형·상태 처리 결과
5. Playwright 증거와 검증 명령 결과
6. 아직 제품 또는 백엔드 결정이 필요한 항목
7. 변경한 주요 파일 링크

작업 중 발견한 기존 결함을 숨기지 말되, 요청 범위와 무관한 대규모 리팩터링으로 확장하지 마라. 디자인의 완성도뿐 아니라 실제 정보 탐색 속도, 복구 가능성, URL 재현성, 권한 안전성, 구현 가능성을 같은 수준으로 평가하라.
```
