# 디자인 합격 기준·검증·핸드오프

## 1. 독립 감사 결론

3개 서브에이전트가 IA/여정, 상태·접근성, 디자인 핸드오프 관점에서 각각 검토했다.

공통 결론:

- 현행 UI 분석과 1차 컨셉 탐색 자료로는 충분하다.
- 역할/권한, end-to-end 여정, 기존 요구 추적, content stress, interaction/accessibility, pass/fail 기준이 없으면 디자인 Agent가 중요한 제품 결정을 임의로 내린다.
- 기존 43개 이미지와 감사 후 추가한 7개 이미지는 “현행 렌더링 구조가 달라지는 대표 상태”와 주요 접근성/스트레스 증거이지 모든 데이터·오류·접근성 조합의 데카르트 곱은 아니다.

이번 보강으로 위 결정 입력은 문서화했다. `Open`으로 남긴 정책은 제품/백엔드 확인이 필요하므로 디자인 Agent가 임의 확정해서는 안 된다.

## 2. 공통 Pass/Fail 기준

| ID | 기준 | Pass |
| --- | --- | --- |
| G-01 | Responsive | 320, 390, 768, 1024, 1280, 1440px에서 document horizontal overflow 0 |
| G-02 | Zoom | 200% zoom과 320 CSS px reflow에서 핵심 과업 완료 |
| G-03 | Keyboard | mouse 없이 nav, filter, pagination, selection, source, retry, trigger 완료 |
| G-04 | Focus | route/query/dialog/drawer/mutation 후 focus 목적지가 명시되고 가려지지 않음 |
| G-05 | Async | loading/refetch/empty/error/retry/success가 visible + 적절한 live announcement |
| G-06 | Recovery | 모든 error에 영향 범위, 다음 행동, Retry 또는 safe destination |
| G-07 | Status | PARTIAL/FAILED를 색 외 text/icon/영향 설명으로 구분 |
| G-08 | Theme | light/dark/forced-colors에서 text, state, border, focus 대비 충족 |
| G-09 | Motion | reduced motion에서 과업·상태 의미 손실 없음 |
| G-10 | Content | empty/null/long/unbroken/many items에서 기능·정보 손실 없음 |
| G-11 | URL | filter/page/selection/deep link가 공유·Back 가능한 범위까지 URL 반영 |
| G-12 | Security | 일반 사용자에게 Batch log/trigger가 노출되지 않음 |

## 3. 화면별 Given/When/Then

### Latest Market

- Given 390×844, When Latest가 READY, Then 첫 viewport 안에 mode, businessDate, freshness, status, global headline이 보인다.
- Given PARTIAL, Then 영향받은 시장/데이터와 사용 가능한 범위를 설명한다.
- Given 한 시장/indices/clusters가 비어 있음, Then 빈 영역의 의미와 대체 행동을 제공한다.
- Given API loading/refetch, Then 기존 정보 구조가 완전히 사라지지 않고 진행 상태를 알 수 있다.
- Given error, Then 시장 요약 Retry와 마지막 성공 snapshot 이동을 제공한다.
- Given 10개 index/20개 cluster, Then 우선순위와 progressive disclosure가 유지된다.

### Archive Search

- Given filter draft, When invalid future/reversed date를 Apply, Then field-level error와 첫 오류 focus가 있다.
- Given valid Apply, Then URL이 갱신되고 page=1이며 filter context가 유지된다.
- Given loading/error, Then filters와 이전 결과를 불필요하게 제거하지 않는다.
- Given pagination, Then Back으로 이전 page/filter/scroll이 복원된다.
- Given 390px, Then table 전체 가로 스크롤 없이 date/headline/status/detail action에 접근한다.
- Given no results, Then Reset과 다른 날짜 범위 탐색을 제공한다.

### Archive Detail

- Given snapshot, Then Latest가 아니라는 mode/date/version 문맥을 2초 안에 구분할 수 있다.
- Given pageId와 URL date, Then 어떤 값이 snapshot identity인지 표시한다.
- Given 인접 날짜 탐색, Then 미래/없는 날짜의 validation과 alternative를 제공한다.
- Given Back, Then Archive filter/page/scroll을 복원한다.

### Cluster Detail

- Given Latest 또는 Archive origin, Then breadcrumb/origin context가 정확하다.
- Given browser Back, Then 진입한 snapshot과 scroll 위치로 돌아간다.
- Given direct deep link, Then 같은 날짜 snapshot 또는 안전한 fallback을 제공한다.
- Given original/mirror link, Then 새 탭 후 기존 link에 focus context가 유지된다.
- Given analysis/articles/tags 0건, Then 빈 panel 대신 의미 있는 empty state를 보인다.
- Given 50개 article, Then 탐색 성능과 keyboard focus가 유지된다.

### Batch Operations

- Given Operator, Then summary/list/detail/trigger에 접근 가능하다.
- Given Viewer/403, Then log가 노출되지 않고 permission state와 safe destination이 있다.
- Given 20건 초과, Then 모든 page/cursor 결과에 접근 가능하다.
- Given FAILED 자동 선택, Then 선택 이유와 selected/focus/failed 스타일이 구분된다.
- Given detail loading/error, Then list/filter/summary는 유지된다.
- Given job detail, Then stage/error/impact/pageId/version/rerun 가능 여부가 구조화된다.
- Given 390px, Then list → detail drill-in과 Back 복원이 가능하다.

### Manual Trigger

- Given trigger action, Then businessDate, run type, permission, duplicate 상태를 confirm한다.
- Given pending, Then 중복 제출이 불가능하고 작업 시작 상태를 발표한다.
- Given success, Then jobId, status, startedAt, View job를 제공한다.
- Given 409, Then 기존 running job로 이동할 수 있다.
- Given 403, Then 권한 설명과 safe destination을 제공한다.
- Given network/5xx, Then 입력을 유지하고 Retry할 수 있다.

## 4. 현재 캡처와 v2 필수 상태 추적

| 영역 | 현행 증거 | v2 디자인 필수 추가 variant |
| --- | --- | --- |
| Latest | 01–09, 46–47, 49 | 한 시장 partial, indices/clusters empty, refetch/retry |
| Archive Detail | 10–13 | date nav, version conflict, no-date, Retry |
| Archive Search | 14–20, 42 | validation, query-only focus, 320px, keyboard, long headline |
| Cluster | 21–25 | 50 articles, source failure, origin/back, long analysis |
| Batch | 26–36, 43, 48, 50 | pagination controls, running/null fields, 403, 409, success job |
| Auth/System | 37–41 | session expired action, permission denied |
| Theme | 01–02 | light PARTIAL/error/focus/select, forced-colors |
| Interaction | 19, 27, 33–35, 44–45 | hover/active/disabled, mobile select |
| Accessibility | viewport 증거 일부 | screen reader announcement, 200% zoom, reduced motion |

추가 상태는 모두 PNG로 만들 필요가 없다. layout, copy, recovery action, focus가 달라지는 등가군은 디자인 frame/component variant로 만들고, 구현 후 Playwright visual/DOM assertion 대상으로 등록한다.

## 5. 오류 등가군 검증

| Scenario | 기대 액션 | 디자인 frame 필요 |
| --- | --- | --- |
| 401 session expired | Login | Yes |
| 403 permission | Safe destination | Yes |
| 422 validation | Field correction | Yes |
| 409 duplicate job | Existing job | Yes |
| 429 rate limit | Timed retry | Component variant |
| 5xx | Retry | Yes |
| offline/network | Connection check/Retry | Yes |
| malformed envelope | Retry + request ID/support | Component variant |
| 404 entity | List/Latest | Yes |

## 6. 콘텐츠 스트레스 검증

각 주요 화면은 아래 fixture로 desktop과 390px에서 확인한다.

- empty string/null
- 일반 길이
- 4배 긴 자연어
- 공백 없는 200자 token
- tags 20개
- articles 50개
- indices/clusters 0개와 10개+
- error log 4,000자
- endedAt/duration/pageVersion null
- 숫자 0, 음수, 매우 큰 값, invalid
- status unknown/RUNNING

## 7. Design 산출물 Definition of Done

### 필수 파일

- 개선 IA와 role/capability map
- 1440, 1024, 390, 320 주요 화면
- 모든 Must flow prototype
- loading/refetch/empty/sparse/partial/error/retry/success/permission variants
- light/dark semantic token
- typography/spacing/grid/elevation/icon/motion foundation
- component inventory와 variant/state
- responsive transformation annotation
- keyboard/focus/live-region annotation
- URL/Back/scroll/deep-link annotation
- content length/empty behavior
- 개발용 prop/data mapping
- Open decision과 backend dependency 목록

### 리뷰 Gate

| Gate | 승인 조건 |
| --- | --- |
| Product | 10~20초 목표, 역할, MVP/Deferred, trigger policy 승인 |
| Design | 2개 이상 핵심 layout 대안 비교, 모든 상태 포함 |
| Accessibility | WCAG 2.2 AA, keyboard, zoom, contrast, announcements 검토 |
| Frontend | 현재 Vite/router/query/view model로 구현 가능 |
| Backend | permission, partial, version, trigger conflict 계약 합의 |
| QA | scenario → criterion → test traceability 완성 |

## 8. 구현 후 QA Matrix

| 범주 | 최소 환경 |
| --- | --- |
| Browser | Chromium, Firefox, WebKit 최신 안정 버전 |
| Desktop | 1440×900, 1280×800, 1024×768 |
| Mobile | 320×568, 390×844, mobile landscape |
| Input | keyboard-only, mouse, touch |
| Theme | light, dark, system change, forced-colors |
| Motion | normal, reduced |
| Zoom | 100%, 200%, 400% reflow |
| Locale | ko-KR, 장문 pseudo-locale |
| Network | fast, slow, offline, timeout |
| Data | normal, empty, partial, long, malformed |

자동화:

- Playwright visual regression
- route/query/Back/scroll/focus DOM assertions
- axe 또는 동등한 automated accessibility scan
- keyboard interaction tests
- document `scrollWidth <= clientWidth` assertion
- console error와 failed request 검사
- live region text assertion
