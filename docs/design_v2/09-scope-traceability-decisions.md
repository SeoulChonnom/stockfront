# 범위·요구사항 추적·결정 로그

현재 코드만 보면 사라진 기능인지 아직 구현되지 않은 요구사항인지 구분할 수 없다. 이 문서는 기존 PRD/IA/Wireframe과 현재 구현을 대조해 디자인 Agent가 범위를 임의로 정하지 않도록 한다.

## 1. 요구사항 추적표

| 항목 | 기존 요구 | 현재 구현 | v2 처리 제안 | 의존성 |
| --- | --- | --- | --- | --- |
| Latest 통합 US/KR | P0 | 구현 | Must 유지, 비교 방식 개선 | 없음 |
| 10~20초 핵심 파악 | 명시 | 계측 없음 | Must, 사용자 테스트 | analytics/테스트 |
| Global headline | P0 | 구현 | Must, 첫 viewport 우선 | 없음 |
| 시장 quick jump/tab | 요구 | 없음 | Should, 탭/점프/비교안 검토 | URL 결정 |
| 원문 articleLinks 목록 | P0, DTO 존재 | mapper/UI가 무시 | Should 복원 여부 결정 | 현재 API 가능 |
| page metadata/counts | 요구, DTO 존재 | mapper/UI가 무시 | Should, 신뢰 정보로 재구성 | 현재 API 가능 |
| 시장 analysis 3요소 | 배경/테마/관전 | summary로 축약 | Should, 정보 밀도안 비교 | 현재 API 일부 가능 |
| Latest skeleton | 요구 | 중앙 loading message | Must v2 상태 설계 | 없음 |
| Latest Retry/마지막 성공 | 요구 | 없음 | Must | query action/endpoint 검토 |
| Archive date picker | 요구 | route date만 표시 | Should | 현재 date API 가능 |
| 이전/다음 날짜 | 요구 | 없음 | Should | 영업일/데이터 존재 정책 |
| 미래 날짜 validation | 요구 | 해당 UI 없음 | date picker 포함 시 Must | 없음 |
| Archive range/status | P0 | 구현 | Must | 없음 |
| Archive recent 7/30 presets | 요구 | 없음 | Could | 없음 |
| Archive filter 유지 error | 요구 | loading/error 시 폼 제거 | Must | query/render 변경 |
| pageId/version snapshot | 재현성 요구 | pageId 우선 조회 | Must, UI에 version 문맥 추가 | 현재 API 가능 |
| Cluster breadcrumb | 요구 | 정적 span | Must link/문맥화 | origin state |
| Cluster external sources | P0 | 구현 | Must | 없음 |
| Cluster 진입 위치 복귀 | 요구 | Archive 고정 이동 | Must | history/origin state |
| Batch permission denied | 요구 | 없음 | Must 결정/설계 | auth/role API |
| Batch log 격리 | 보안 요구 | 모두 노출 | Must | auth/role API |
| Batch filters/list/detail | P0 | 구현 | Must | 없음 |
| Batch 선택 deep link | 없음 | local state | Should | `jobId` query |
| Batch 관련 snapshot 이동 | 요구 취지 | 없음 | Must for triage | pageId available |
| Manual Trigger | P0 API | `{}` 즉시 POST | Must lifecycle 재설계 | backend conflict/permission |
| businessDate/force/rebuild | API type/PRD | UI 없음 | Must 결정, 고급 옵션은 role별 | backend 지원 확인 |
| 동일 날짜 중복 실행 방지 | 안정성 요구 | UI 표현 없음 | Must conflict state | 409/existing job contract |
| 전역 검색 | 현재 Coming soon | 기능 요구 불명확 | Won’t for v2 MVP 제안 | search API 없음 |
| Support/Documentation/footer | Coming soon | 정적 표시 | Won’t/제거 제안 | 콘텐츠/운영 주체 없음 |
| dark/light | 구현 | 구현 | Must | persistence 결정 |
| 다중 국가/실시간/개별 종목 | 범위 제외 | 없음 | Won’t | — |

## 2. v2 MVP 제안

### Must

- Latest, Archive Search/Detail, Cluster Detail, Batch Operations, system states
- 하나의 명확한 primary navigation
- 최신/과거 snapshot의 즉시 구분
- 320/390px에서 document horizontal overflow 제거
- loading, refetching, empty, sparse, partial, error, retry 상태
- URL filter/pagination과 browser Back 복원
- Cluster 진입 원점과 scroll 문맥 복원
- Operations 권한/로그 격리
- Manual Trigger confirm/pending/success/conflict/forbidden/error
- Batch job에서 관련 snapshot/page version 이동
- keyboard, focus, live region, 200% zoom, reduced motion, dark/light

### Should

- 시장 quick jump 또는 비교 control
- articleLinks와 metadata를 신뢰/출처 정보로 복원
- Archive 날짜 선택과 인접 날짜 탐색
- Batch selected `jobId` deep link
- 최근 기간 preset
- 마지막 성공 snapshot과 retry/runbook 연결
- theme preference 저장

### Could

- 전역 검색
- 사용자 설정/density
- saved Archive filter
- Batch auto-refresh interval control
- 복수 snapshot/version 비교

### Won’t — v2 MVP

- 실시간 뉴스 스트림
- 개인화 피드
- 개별 종목 호가/티커
- 추가 국가/자산군
- 복잡한 워크플로우 오케스트레이션
- 내용과 소유자가 없는 Coming soon navigation

## 3. Current / Required / Proposed 구분

디자인 파일과 주석은 각 항목에 다음 label을 사용한다.

- `CURRENT`: 코드와 캡처에 존재
- `REQUIRED`: 기존 P0 또는 보안/재현성 요구
- `PROPOSED`: 이번 문서가 제안하지만 승인 전
- `DEFERRED`: v2 MVP 제외
- `BACKEND`: API/권한 계약이 먼저 필요

예:

```text
[CURRENT] Archive date/status filters
[REQUIRED] Error 시 filters 유지
[PROPOSED] 7일/30일 preset
[BACKEND] Permission-scoped batch logs
[DEFERRED] Global search
```

## 4. 주요 결정 로그

| ID | 결정 질문 | 기본 제안 | 상태 | 책임/의존성 |
| --- | --- | --- | --- | --- |
| D-01 | 단일 사용자 또는 Viewer/Operator 분리? | 최소 2개 capability로 분리 | Open | Product/Auth |
| D-02 | primary nav 위치? | desktop sidebar 또는 topbar 중 하나만 | Design | IA |
| D-03 | mobile nav? | compact header + drawer/bottom nav 비교 | Design | 3개 primary item |
| D-04 | Latest US/KR 구조? | 첫 viewport 비교 summary + 상세 section | Explore 2안 | 사용자 테스트 |
| D-05 | Archive Detail 날짜 nav? | date picker + 이전/다음 유효 snapshot | Open | API/business calendar |
| D-06 | 같은 날짜 복수 version? | pageId/version 명시, 최신 version 기본 | Open | Backend/Product |
| D-07 | Cluster Back? | origin route/scroll 복원, direct link fallback | Proposed | Router state |
| D-08 | Source View 명칭? | “같은 날짜 기록 보기” 등 실제 목적 반영 | Design | Content |
| D-09 | mobile Archive 표현? | priority list + expandable detail | Explore | content priority |
| D-10 | mobile Batch 표현? | list → full-page job detail drill-in | Explore | deep link |
| D-11 | Manual Trigger 입력? | businessDate 필수, 고급 옵션 권한별 | Open | Backend/Auth |
| D-12 | trigger confirmation? | 날짜·실행 유형·중복 상태를 포함 | Proposed | mutation risk |
| D-13 | PARTIAL 상세 범위? | 상단 + 영향 섹션 inline 표시 | Open | API partial metadata |
| D-14 | 전역 search? | v2 MVP에서 제거 | Proposed | API 없음 |
| D-15 | theme 저장? | local preference + system fallback | Proposed | frontend |
| D-16 | auto-refresh? | Batch에만 명시적 interval/paused 상태 | Open | query/SLA |

## 5. API 변경 없이 가능한 개선

- navigation 통합과 responsive 구조
- Latest/Archive mode 표시
- 현재 error에 Retry 버튼
- Archive filters를 loading/error 중 유지
- mobile table을 priority list/card로 재구성
- jobId를 URL query에 반영
- pageId/version 표시와 관련 snapshot 링크
- skeleton/inline progress
- focus/scroll/live region/keyboard
- articleLinks와 metadata DTO를 mapper에 연결
- trigger success job ID 표시

## 6. API 또는 정책 결정이 필요한 개선

- 401 session expired와 403 permission denied 구분
- 역할별 Batch/log/trigger 권한
- PARTIAL의 누락 섹션·원인 구조화
- 마지막 성공 snapshot 조회
- 존재하는 이전/다음 business date
- 같은 날짜 복수 version 선택
- background job progress/자동 refresh
- duplicate trigger의 409 + existing job payload
- force/rebuild 실행 권한과 audit trail

