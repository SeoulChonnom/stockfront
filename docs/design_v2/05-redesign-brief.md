# Design v2 Brief

## 1. 제품 목적

Market Brief는 시장 정보 소비와 운영 모니터링을 한 SPA에 묶은 금융 인텔리전스 콘솔이다.

핵심 사용자는 다음 두 성격을 동시에 가진다.

- 시장 정보를 빠르게 훑고 뉴스 근거까지 추적하는 분석 사용자
- 데이터 생성 파이프라인의 부분 실패와 장애를 확인하고 재실행하는 운영 사용자

v2는 “많은 카드가 있는 대시보드”보다 다음 질문에 빠르게 답하는 도구가 되어야 한다.

1. 오늘 시장에서 무엇이 중요하고 왜 그런가?
2. 이 요약의 신뢰도와 생성 상태는 어떤가?
3. 근거가 된 뉴스는 무엇인가?
4. 과거 날짜의 결과와 비교하거나 찾을 수 있는가?
5. 데이터 파이프라인이 실패했다면 어디서 무엇을 해야 하는가?

## 2. 반드시 유지할 기능 계약

- Vite React SPA와 현재 커스텀 URL 계약
- `/stock/` base path
- Latest, Archive Search/Detail, Cluster Detail, Batch Operations, 404
- dark/light theme
- Daily/Archive/Batch의 PARTIAL 및 FAILED 상태
- 시장별 narrative, indices, clusters
- cluster의 original/mirror link 구분
- archive 날짜 범위, 상태 필터, pagination
- batch 목록과 선택 상세의 독립 loading/error
- manual trigger pending/error와 성공 후 query refresh
- 키보드 접근 가능한 링크/버튼/폼, route focus 관리
- 390px부터 1440px 이상까지의 반응형 경험

라우팅 프레임워크나 Next.js를 가정하지 말고, 결과는 현재 React/Vite 구조에 적용 가능한 컴포넌트 설계여야 한다.

## 3. 현재 UX 문제와 증거

| 우선순위 | 문제 | 영향 | 근거 |
| --- | --- | --- | --- |
| P0 | 아카이브/배치 테이블의 고정 최소 폭 | 모바일은 약 862px document width가 되고, 데스크톱 Batch 2열에서도 마지막 열/선택 액션이 초기 패널 밖으로 밀림 | [Archive 390px](./screenshots/42-archive-search-mobile-viewport.png), [Batch 390px](./screenshots/43-batch-mobile-viewport.png), [Batch desktop](./screenshots/26-batch-mixed-default-failed-desktop.png) |
| P0 | 모바일에서 전체 sidebar가 본문 앞에 노출 | 페이지 제목과 핵심 데이터 도달이 늦고 첫 화면이 메뉴 중심 | [Latest mobile](./screenshots/09-latest-ready-mobile.png) |
| P0 | Batch pagination UI가 없음 | API/View Model은 page를 지원하지만 20건 이후 결과 접근 불가 | Batch query/View Model과 footer의 불일치 |
| P0 | Operations 권한과 로그 격리가 없음 | 일반 사용자에게 내부 로그·Trigger가 노출될 수 있음 | 기존 PRD 보안 요구와 현재 코드 차이 |
| P1 | 동일한 primary nav가 sidebar/topbar에 중복 | 공간 낭비, 활성 규칙 불일치, 정보 위계 혼란 | [Cluster detail](./screenshots/21-cluster-detail-ready-desktop.png) |
| P1 | loading/error가 화면 전체를 empty message로 교체 | 사용자가 필터/이전 데이터/복구 액션을 잃음 | [Archive loading](./screenshots/17-archive-search-loading-desktop.png), [Batch error](./screenshots/30-batch-list-error-desktop.png) |
| P1 | 오류 상태에 retry가 없음 | 복구 경로가 새로고침밖에 없음 | [Latest error](./screenshots/07-latest-api-error-desktop.png) |
| P1 | Batch trigger 결과 피드백이 약함 | pending 이후 성공 여부와 생성된 job을 알기 어려움 | [Pending](./screenshots/33-batch-trigger-pending-desktop.png), [Error](./screenshots/34-batch-trigger-error-desktop.png) |
| P1 | 최신/아카이브 상세의 모드 구분이 약함 | 사용자가 현재 데이터인지 과거 snapshot인지 혼동 가능 | [Latest](./screenshots/01-latest-ready-dark-desktop.png), [Archive](./screenshots/10-archive-detail-ready-desktop.png) |
| P2 | Coming soon 요소가 여러 위치를 차지 | 사용 불가능한 요소가 탐색과 시각적 주의를 방해 | 대표 화면 전반 |
| P2 | 시장 overview가 반복 카드로 매우 김 | 핵심 이슈 우선순위와 시장 간 비교가 어려움 | Latest full-page 약 2235px, mobile 약 5408px |
| P2 | 빈 markets 성공 응답에 설명 없음 | 데이터가 없는지 오류인지 알 수 없음 | [빈 markets](./screenshots/05-latest-empty-markets-desktop.png) |
| P2 | 클러스터 sparse 상태가 빈 패널을 유지 | 정보 부재와 로딩/오류를 구분하기 어려움 | [Sparse cluster](./screenshots/22-cluster-detail-sparse-desktop.png) |
| P1 | 장문/공백 없는 콘텐츠가 document width를 확장 | mobile 1149px, desktop Batch error 2135px까지 가로 확장 | [Long market](./screenshots/47-latest-long-content-mobile.png), [Long log](./screenshots/48-batch-long-error-desktop.png) |

## 4. v2 경험 목표

### A. 더 빠른 스캔

- Global headline, 신뢰/생성 상태, 시장별 핵심 변화가 첫 viewport 안에서 읽혀야 한다.
- 지수는 표 또는 밀도 높은 비교 컴포넌트도 검토한다.
- 뉴스 클러스터는 중요도, 기사 수, 근거 접근을 명확히 분리한다.
- 두 시장을 반복 스크롤하기보다 tab, segmented control, 비교 뷰 중 적절한 모델을 제안한다.

### B. 명확한 정보 위계

- primary navigation은 한 체계로 통합한다.
- Market intelligence와 Operations를 상위 영역으로 구분한다.
- 최신/과거 snapshot을 배지, 날짜 컨텍스트, breadcrumb에서 즉시 구분한다.
- disabled Coming soon 항목은 제거하거나 별도 roadmap/context 영역으로 내린다.

### C. 상태와 복구

- loading은 주요 레이아웃을 유지하는 skeleton 또는 inline progress로 설계한다.
- error는 영향을 받는 범위 안에서 나타내고 Retry를 제공한다.
- partial은 단순 노란 chip이 아니라 누락된 데이터 범위와 영향도를 설명한다.
- empty는 검색 결과 없음, 생성 데이터 없음, 연결 기사 없음으로 문구와 액션을 구분한다.
- batch trigger 성공은 job ID, 현재 상태, 상세로 이동 액션을 제공한다.
- Batch 목록은 page/cursor/load-more 중 하나로 모든 결과 접근을 보장한다.
- Viewer와 Operator의 메뉴, 로그, Trigger 권한을 분리한다.

### D. 모바일 우선

- 모바일 primary nav는 compact header + drawer/bottom navigation 등 명시적인 패턴을 사용한다.
- 테이블은 priority columns + expandable row, 카드 리스트, column chooser 중 하나로 재설계한다.
- 모든 핵심 액션은 390px viewport 안에서 가로 스크롤 없이 접근 가능해야 한다.
- 제목 focus를 유지하면서 의도치 않은 초기 scroll offset이 생기지 않게 한다.

### E. 운영 효율

- 실패/부분 실패 작업이 목록 상단과 KPI에서 일관되게 강조되어야 한다.
- 목록 선택과 상세의 관계가 행 전체, master-detail, mobile drill-in에서 명확해야 한다.
- error code, 단계, 시간, 재시도 가능 여부, 관련 페이지를 구조화한다.
- 수동 실행은 확인, 진행, 성공/실패, 생성 작업 추적의 전체 lifecycle을 설계한다.

## 5. 요청하는 디자인 산출물

1. 개선된 IA와 primary navigation
2. Desktop 1440, tablet 1024, mobile 390 기준 주요 화면
3. 아래 상태를 포함한 component variants
   - loading, refetching, empty, sparse, partial, failed, retrying
   - trigger idle, confirm, pending, success, error
   - table/list desktop와 mobile 대체 표현
4. Latest와 Archive Detail의 명확한 모드 차이
5. Market overview의 정보 밀도 2안 이상
6. Batch master-detail의 desktop/mobile 전환
7. dark/light semantic token
8. focus, keyboard, live region, contrast를 포함한 접근성 메모
9. 현재 DTO/View Model로 구현 가능한 component prop contract
10. 08~12 문서의 사용자 여정, 결정 로그, content stress, acceptance criterion 추적

## 6. 디자인 선택 시 검증 질문

- 첫 viewport에서 날짜, freshness, 상태, headline, 가장 중요한 시장 변화가 보이는가?
- PARTIAL이 “어떤 데이터가 빠졌는지” 설명하는가?
- 사용자가 최신과 아카이브를 2초 안에 구분할 수 있는가?
- 모바일에서 전체 앱을 가로 스크롤하지 않아도 되는가?
- 목록 loading/error가 필터와 이전 결과를 불필요하게 제거하지 않는가?
- Batch FAILED가 강하게 보이되 정상 운영 화면 전체를 위험색으로 오염시키지 않는가?
- 원문/미러/분석 결과의 출처와 액션 의미가 구분되는가?
- 디자인이 실제 API의 nullable/empty 필드를 견디는가?

## 7. 디자인 전문 AI Agent에 바로 전달할 요청문

```text
당신은 금융 데이터 콘솔과 운영 도구 경험을 설계하는 senior product designer다.

첨부된 docs/design_v2 문서를 먼저 모두 읽고, screenshots 폴더의 상태별 화면을 근거로 Market Brief UI v2를 설계해 달라.

목표:
- 시장 핵심 변화와 데이터 신뢰 상태를 더 빠르게 파악
- Latest/Archive/Cluster 간 정보 추적을 명확하게 연결
- Batch 실패 조사와 수동 실행 lifecycle 개선
- 390px 모바일에서 가로 overflow 제거
- loading/error/empty/partial/failed 상태에 명확한 복구 경로 제공
- Viewer/Operator 권한과 운영 로그 노출 분리
- Batch pagination과 20건 이상 결과 접근 보장

제약:
- Vite React SPA, 현재 커스텀 라우트와 /stock/ base path 유지
- API/DTO/View Model 계약은 04-component-data-contract.md 기준
- dark/light 지원
- 현재 접근성 계약을 보존하고 개선
- 데스크톱 전용 hover에 핵심 기능을 숨기지 않음
- 09-scope-traceability-decisions.md의 Open 항목은 임의 확정하지 말고 가정/대안으로 표시

산출물:
1) 개선 IA와 navigation rationale
2) 1440/1024/390/320 wireframe
3) Latest, Archive Search, Archive Detail, Cluster Detail, Batch Operations, system states
4) 모든 상태 variant와 interaction flow
5) semantic design tokens
6) 구현 가능한 React component breakdown과 props
7) 현재 UI 대비 변경 이유 및 migration priority
8) role/capability map, URL/Back/focus/scroll interaction annotation
9) 12-acceptance-validation-handoff.md와 연결된 acceptance trace

무조건 카드 수를 늘리는 방식은 피하고, 정보 밀도·비교·우선순위를 먼저 설계해 달라.
```
