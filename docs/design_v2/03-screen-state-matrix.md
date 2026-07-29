# 화면 상태 및 캡처 매트릭스

모든 PNG는 Chromium headless + Playwright로 생성했다. 기본 데스크톱 viewport는 1440×1000, 태블릿은 1024×900, 모바일은 390×844다. 별도 표기가 없으면 dark theme, full-page 캡처다.

## 1. Latest Market

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 01 | READY / dark / desktop | [PNG](./screenshots/01-latest-ready-dark-desktop.png) | 전체 2개 시장, 지수·클러스터 |
| 02 | READY / light / desktop | [PNG](./screenshots/02-latest-ready-light-desktop.png) | light token 대응 |
| 03 | PARTIAL data status | [PNG](./screenshots/03-latest-partial-desktop.png) | 경고색 상태 chip, 콘텐츠는 정상 노출 |
| 04 | FAILED data status | [PNG](./screenshots/04-latest-failed-status-desktop.png) | 실패색 상태 chip, 콘텐츠는 정상 노출 |
| 05 | 성공 응답 + 빈 markets | [PNG](./screenshots/05-latest-empty-markets-desktop.png) | hero만 남고 별도 empty 안내 없음 |
| 06 | API loading | [PNG](./screenshots/06-latest-loading-desktop.png) | 셸 유지, 본문 전체 중앙 메시지 |
| 07 | API 503 error | [PNG](./screenshots/07-latest-api-error-desktop.png) | 재시도 없이 오류 문자열 노출 |
| 08 | READY / tablet 1024px | [PNG](./screenshots/08-latest-ready-tablet.png) | 1180px 이하의 1열 hero/2열 card 구조; sidebar 전환은 980px 이하 |
| 09 | READY / mobile 390px | [PNG](./screenshots/09-latest-ready-mobile.png) | 1열 전환, 매우 긴 페이지 |

## 2. Archive Market Detail

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 10 | pageId 조회 / READY | [PNG](./screenshots/10-archive-detail-ready-desktop.png) | `pageId=41`이 날짜 조회보다 우선 |
| 11 | 날짜 조회 / PARTIAL | [PNG](./screenshots/11-archive-detail-partial-desktop.png) | pageId가 없을 때 business date 사용 |
| 12 | API loading | [PNG](./screenshots/12-archive-detail-loading-desktop.png) | Market 공통 loading |
| 13 | API 503 error | [PNG](./screenshots/13-archive-detail-error-desktop.png) | Market 공통 error |

Latest와 Archive Detail의 본문 컴포넌트가 같으므로 반응형 캡처는 Latest 08/09가 동일 구조를 대표한다.

## 3. Archive Search

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 14 | 4건 / 1페이지 | [PNG](./screenshots/14-archive-search-populated-desktop.png) | READY/PARTIAL/FAILED 혼합, Next 활성 |
| 15 | 2건 / 2페이지 | [PNG](./screenshots/15-archive-search-page-2-desktop.png) | Prev 활성, Next 비활성 |
| 16 | 빈 필터 결과 | [PNG](./screenshots/16-archive-search-empty-desktop.png) | table 안 empty row |
| 17 | list loading | [PNG](./screenshots/17-archive-search-loading-desktop.png) | 검색 폼도 보이지 않고 전체 교체 |
| 18 | list API 503 | [PNG](./screenshots/18-archive-search-error-desktop.png) | 검색 폼도 보이지 않고 전체 교체 |
| 19 | Status select open | [PNG](./screenshots/19-archive-search-filter-open-desktop.png) | Radix popover 옵션 |
| 20 | mobile full-page | [PNG](./screenshots/20-archive-search-mobile.png) | scroll width까지 포함해 862px PNG 생성 |
| 42 | mobile viewport | [PNG](./screenshots/42-archive-search-mobile-viewport.png) | 390px에서 오른쪽 콘텐츠가 잘리는 실제 첫 뷰 |

## 4. Cluster Detail

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 21 | 정상 상세 | [PNG](./screenshots/21-cluster-detail-ready-desktop.png) | 분석 3문단, 기사 3건, 대표 기사/metric |
| 22 | sparse data | [PNG](./screenshots/22-cluster-detail-sparse-desktop.png) | 분석·기사·태그 없음, 비안전 URL 버튼 제거 |
| 23 | detail loading | [PNG](./screenshots/23-cluster-detail-loading-desktop.png) | 셸 유지, 본문 전체 교체 |
| 24 | detail API 503 | [PNG](./screenshots/24-cluster-detail-error-desktop.png) | 재시도 액션 없음 |
| 25 | mobile 390px | [PNG](./screenshots/25-cluster-detail-mobile.png) | main 이후 representative/metric 순서 |

## 5. Batch Operations

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 26 | mixed rows / FAILED 기본 선택 | [PNG](./screenshots/26-batch-mixed-default-failed-desktop.png) | FAILED row 우선 선택, Attention KPI |
| 27 | SUCCESS 수동 선택 | [PNG](./screenshots/27-batch-selected-success-desktop.png) | chevron 클릭 후 detail만 변경 |
| 28 | 빈 목록 | [PNG](./screenshots/28-batch-empty-desktop.png) | KPI fallback, selected run 없음 |
| 29 | list loading | [PNG](./screenshots/29-batch-list-loading-desktop.png) | 화면 전체 대체 |
| 30 | list API 503 | [PNG](./screenshots/30-batch-list-error-desktop.png) | 화면 전체 대체 |
| 31 | detail loading | [PNG](./screenshots/31-batch-detail-loading-desktop.png) | 목록/KPI 유지, 오른쪽 패널만 loading |
| 32 | detail API 503 | [PNG](./screenshots/32-batch-detail-error-desktop.png) | 목록/KPI 유지, 오른쪽 패널 alert |
| 33 | Manual Trigger pending | [PNG](./screenshots/33-batch-trigger-pending-desktop.png) | disabled `Triggering...` |
| 34 | Manual Trigger error | [PNG](./screenshots/34-batch-trigger-error-desktop.png) | 오류가 페이지 맨 아래에만 노출 |
| 35 | Status select open | [PNG](./screenshots/35-batch-filter-open-desktop.png) | ALL/SUCCESS/PARTIAL/FAILED |
| 36 | mobile full-page | [PNG](./screenshots/36-batch-mobile.png) | scroll width까지 포함해 862px PNG 생성 |
| 43 | mobile viewport | [PNG](./screenshots/43-batch-mobile-viewport.png) | 390px 실제 첫 뷰와 가로 잘림 |

Manual Trigger 성공은 POST 성공 직후 jobs/detail query invalidate만 수행한다. 별도 성공 UI가 없으므로 정지 이미지로 식별 가능한 독립 상태가 없다.

## 6. System / Authentication

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 37 | Not Found | [PNG](./screenshots/37-not-found-desktop.png) | 보호 셸 안 empty state |
| 38 | 개발 모드 auth loading | [PNG](./screenshots/38-auth-loading-desktop.png) | token mock을 지연, 셸 숨김 |
| 39 | 프로덕션 auth loading | [PNG](./screenshots/39-auth-production-loading-desktop.png) | production config에서도 동일 |
| 40 | 프로덕션 redirecting | [PNG](./screenshots/40-auth-production-redirecting-desktop.png) | `/login` navigation은 Playwright가 abort해 화면 보존 |
| 41 | auth config failed | [PNG](./screenshots/41-auth-config-failed-desktop.png) | 빈 `VITE_API_HOST`, 접근 가능한 alert |

## 7. 코드에는 있으나 Mock API만으로 도달하기 어려운 분기

| 분기 | 코드 조건 | 도달하기 어려운 이유 | v2 결정 필요 |
| --- | --- | --- | --- |
| No Market Data | query가 loading/error가 아니고 `snapshot`이 없음 | 성공 응답은 매퍼가 항상 snapshot 객체를 만들고, 잘못된 envelope는 error가 됨 | 제거하거나 `null/204` 계약을 명시 |
| No Cluster Data | query가 loading/error가 아니고 `data`가 없음 | 성공 응답은 매퍼가 항상 detail 객체를 만들고, 실패는 error가 됨 | 제거하거나 empty detail 계약을 명시 |
| auth idle | 최초 render 극초기 | effect 실행 직후 loading으로 즉시 전환되고 메시지도 loading과 동일 | 별도 디자인 불필요 |
| trigger success feedback | mutation success | invalidate만 하고 success UI가 없음 | toast/inline job link 설계 |

## 8. 캡처 완전성 기준

이번 “모든 상황”의 범위는 아래 축의 조합을 의미한다.

- 모든 사용자 접근 라우트
- 각 라우트의 정상 데이터
- 코드가 실제 API 응답으로 도달 가능한 loading/error/empty/sparse
- 도메인 상태 READY/SUCCESS, PARTIAL, FAILED
- 목록 pagination 양 끝
- select popover, row selection, mutation pending/error
- dark/light
- desktop/tablet/mobile
- 인증 전역 상태와 404

모든 조합의 데카르트 곱을 중복 캡처하지는 않았다. 동일 컴포넌트를 공유하는 상태는 대표 화면으로 묶었고, 화면 구조가 달라지는 조합은 모두 포함했다.

## 9. 서브에이전트 감사 후 추가한 증거

| ID | 상태 | 캡처 | 확인 포인트 |
| --- | --- | --- | --- |
| 44 | Skip link focus | [PNG](./screenshots/44-skip-link-focus-desktop.png) | focus-visible은 보이지만 brand 위와 겹침 |
| 45 | Archive Search button focus | [PNG](./screenshots/45-archive-search-focus-visible-desktop.png) | form action keyboard focus |
| 46 | Latest 320×568 viewport | [PNG](./screenshots/46-latest-320px-viewport.png) | route focus와 최소 폭 첫 화면 |
| 47 | Long content / mobile | [PNG](./screenshots/47-latest-long-content-mobile.png) | 390px viewport에서 document width 1149px로 확장 |
| 48 | Long batch error / desktop | [PNG](./screenshots/48-batch-long-error-desktop.png) | 1440px viewport에서 document width 2135px로 확장 |
| 49 | PARTIAL / light | [PNG](./screenshots/49-latest-partial-light-desktop.png) | light warning 상태 |
| 50 | Batch page 2 / 44 total | [PNG](./screenshots/50-batch-page-2-without-controls-desktop.png) | page=2 응답이나 이동/페이지 표시 control 없음 |

## 10. 캡처되지 않은 현행/요구 edge case

아래 항목은 이번 50개 PNG에 없으며 v2 디자인 variant 또는 구현 QA에서 다룬다.

- Batch page 1/중간/마지막/범위 초과: 현재 query/View Model에는 pagination이 있지만 UI 이동 수단이 없음
- 401 session expired, 403 permission denied, 422 validation, 409 duplicate trigger, 429, offline, malformed envelope
- background refetch/retrying과 query-only 전환 focus
- Manual Trigger confirm/success/new job
- keyboard focus, skip link, screen reader live announcement
- 320px, mobile landscape, 200% zoom, forced-colors, reduced motion
- 50개 article/20개 cluster 등 대규모 배열과 독립 nullable 조합
- 한 시장만 empty/partial, indices/clusters 독립 empty, 50개 article
- batch RUNNING/null endedAt/duration/pageVersion
- light theme의 PARTIAL/FAILED/error/disabled/focus/select

이는 캡처 누락을 숨기는 목록이 아니라 [12-acceptance-validation-handoff.md](./12-acceptance-validation-handoff.md)의 디자인·QA 입력이다.
