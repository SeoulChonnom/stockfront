# Current UI Guideline Audit

최신 [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)과 WCAG 관점에서 현재 코드를 검토한 결과다. 이 문서는 구현 수정 목록이 아니라 v2 디자인이 반드시 해결하거나 명시적으로 유지해야 할 요구사항이다.

## index.html

`index.html:2` - 주 사용 언어가 한국어인데 `lang="en"`; v2는 실제 locale과 문서 언어 일치 필요

`index.html:3` - light/dark 배경에 맞는 `<meta name="theme-color">` 전략 없음

## src/App.tsx

`src/App.tsx:71` - theme가 시스템 설정으로만 초기화되고 사용자 선택을 저장하지 않음; persistence 정책 결정 필요

`src/App.tsx:105` - route focus가 `focus()`만 호출하고 scroll offset 정책이 없어 모바일 첫 viewport가 중간으로 이동함

증거: [320px route focus](./screenshots/46-latest-320px-viewport.png)

`src/App.tsx:110` - focus target은 title/main뿐이며 loading/error 전환 후 focus 또는 live announcement 계약이 화면마다 다름

## src/components/app-shell.tsx

`src/components/app-shell.tsx:73` - primary navigation과 section navigation이 중복되고 Cluster Detail 활성 규칙이 서로 다름

`src/components/app-shell.tsx:64` - skip link는 focus 시 보이지만 brand와 겹치는 위치; [focus 캡처](./screenshots/44-skip-link-focus-desktop.png)

`src/components/app-shell.tsx:107` - 비활성 검색 입력이 모든 화면의 주요 header 공간을 차지함

`src/components/app-shell.tsx:178` - `Admin.Ops` user chip은 interactive/account UI처럼 보이지만 동작·역할 설명이 없음

`src/components/app-shell.tsx:190` - footer의 Coming soon 항목은 링크처럼 보이는 정적 텍스트; affordance 정리 필요

## src/components/ui.tsx

`src/components/ui.tsx:21` - `PageMessage`의 `role`과 `aria-live`가 optional이라 대부분의 비동기 loading/error가 보조기기에 발표되지 않음

`src/components/ui.tsx:33` - error와 empty가 동일 구조이며 retry/action slot이 없음

## src/app/market-overview-route-content.tsx

`src/app/market-overview-route-content.tsx:17` - loading이 기존 정보 구조 전체를 제거하고 중앙 메시지로 교체됨

`src/app/market-overview-route-content.tsx:26` - API error에 next step/Retry 액션이 없음

`src/app/market-overview-route-content.tsx:35` - `No Market Data`는 현재 query/envelope 의미 체계로 도달하기 어려운 분기

## src/pages/market-overview-page.tsx

`src/pages/market-overview-page.tsx:41` - focused page title에 sticky header용 `scroll-margin-top` 계약 없음

`src/pages/market-overview-page.tsx:73` - 반복 시장 섹션이 `h3`로 시작해 문서 heading hierarchy가 Global Insight의 `h2` 구조에 의존함

`src/pages/market-overview-page.tsx:73` - `markets`, `indices`, `clusters`, `tags`가 빈 배열일 때 영역별 empty 설명이 없음

`src/pages/market-overview-page.tsx:127` - index value를 heading으로 사용; 카드 이름과 값의 읽기 순서/semantic label 재정의 필요

`src/pages/market-overview-page.tsx:182` - 긴 cluster title/summary/tag 개수 제한이나 overflow 정책 없음

## src/pages/archive-search/archive-search-filters.tsx

`src/pages/archive-search/archive-search-filters.tsx:40` - form에 accessible name/검색 영역 heading이 없음

`src/pages/archive-search/archive-search-filters.tsx:44` - date input에 `name`과 `autocomplete="off"`가 없음

`src/pages/archive-search/archive-search-filters.tsx:58` - date input에 `name`과 `autocomplete="off"`가 없음

`src/pages/archive-search/archive-search-filters.tsx:97` - submit 이후 loading/refetching 상태와 중복 제출 방지 UI가 없음

## src/pages/archive-search-page.tsx

`src/pages/archive-search-page.tsx:37` - list loading/error가 filters와 이전 결과를 모두 제거함

`src/pages/archive-search-page.tsx:46` - list error에 Retry와 적용된 filter context가 없음

`src/pages/archive-search-page.tsx:103` - filter 적용 시 draft validation/error 없이 URL 정규화에 의존함

## src/pages/cluster-detail-page.tsx

`src/pages/cluster-detail-page.tsx:32` - loading/error가 기존 detail 구조 전체를 제거함

`src/pages/cluster-detail-page.tsx:71` - breadcrumb 앞 단계가 텍스트라 직접 상위 화면으로 이동할 수 없음

`src/pages/cluster-detail-page.tsx:99` - analysis가 빈 배열이면 빈 panel만 남고 empty explanation이 없음

`src/pages/cluster-detail-page.tsx:115` - article list가 빈 배열이면 timeline heading 아래에 empty explanation이 없음

`src/pages/cluster-detail-page.tsx:220` - “이전 화면”이 history back이 아니라 Archive Search 고정 이동이라 label과 동작이 불일치

## src/pages/batch-operations-page.tsx

`src/pages/batch-operations-page.tsx:44` - selected job이 local state라 공유/새로고침 가능한 deep link가 아님

`src/pages/batch-operations-page.tsx:48` - FAILED 우선 자동 선택이 사용자에게 설명되지 않고 focus/announcement도 없음

`src/pages/batch-operations-page.tsx:64` - list loading/error가 trigger와 KPI를 포함한 화면 전체를 제거함

`src/pages/batch-operations-page.tsx:131` - Manual Trigger가 즉시 실행되며 권한, 영향 범위, 중복 실행, confirmation 정책이 없음

## src/pages/batch-operations/batch-operations-summary.tsx

`src/pages/batch-operations/batch-operations-summary.tsx:37` - `"Triggering..."` → `"Triggering…"` 및 spinner/progress semantics 필요

`src/pages/batch-operations/batch-operations-summary.tsx:41` - h1 다음 KPI가 h3로 시작해 heading level이 건너뜀

## src/pages/batch-operations/batch-operations-filters.tsx

`src/pages/batch-operations/batch-operations-filters.tsx:34` - form에 accessible name/필터 영역 heading이 없음

`src/pages/batch-operations/batch-operations-filters.tsx:64` - date input에 `name`과 `autocomplete="off"`가 없음

`src/pages/batch-operations/batch-operations-filters.tsx:78` - date input에 `name`과 `autocomplete="off"`가 없음

## src/pages/batch-operations/batch-operations-footer.tsx

`src/pages/batch-operations/batch-operations-footer.tsx:16` - mutation error가 `role="alert"`/`aria-live` 없이 페이지 맨 아래에 나타남

`src/pages/batch-operations/batch-operations-footer.tsx:17` - 실패 문구에 error detail, job context, retry action이 없음

## src/styles/data-display.css

`src/styles/data-display.css:51` - input outline 제거 후 `:focus` replacement만 사용; `:focus-visible` 정책 필요

`src/styles/data-display.css:99` - table overflow가 페이지별 대체 UI 없이 공통 horizontal scroll에만 의존

`src/styles/data-display.css:105` - `min-width: 760px`가 모바일 document overflow와 Batch desktop panel clipping을 만듦

`src/styles/data-display.css:105` - Batch page=2/total=44에서도 pagination control이 없음; [page 2 증거](./screenshots/50-batch-page-2-without-controls-desktop.png)

## src/styles/page-layout.css

`src/styles/page-layout.css:45` - page heading에 `text-wrap: balance`/긴 문자열 break 정책 없음

`src/styles/page-layout.css:243` - narrative, cluster, representative, table copy에 long unbroken content 처리 규칙 없음

증거: [mobile document 1149px](./screenshots/47-latest-long-content-mobile.png), [desktop Batch document 2135px](./screenshots/48-batch-long-error-desktop.png)

## src/styles/responsive.css

`src/styles/responsive.css:21` - 980px 이하에서 sidebar를 축약하지 않고 전체 상단 블록으로 전환

`src/styles/responsive.css:65` - 720px 이하에서 table/card/list 정보 우선순위 재배치 규칙이 없음

`src/styles/responsive.css:108` - 모든 `.button`을 100%로 만들어 컴포넌트별 mobile action priority를 표현하기 어려움

## src/styles/base.css

`src/styles/base.css:83` - `touch-action: manipulation`, safe-area inset, tap highlight 정책 없음

`src/styles/base.css:83` - `prefers-reduced-motion` 대체 규칙 없음

## v2 합격 기준으로 전환할 항목

- 모든 async 상태에 visible 상태 + 적절한 live region + recovery action을 함께 정의한다.
- 390px에서 document-level horizontal overflow가 없어야 한다.
- 200% zoom에서도 핵심 정보와 액션이 손실되지 않아야 한다.
- page title focus 후 sticky header에 가리지 않고 의도치 않은 scroll jump가 없어야 한다.
- keyboard-only로 primary navigation, filter, table/list selection, external source, trigger lifecycle을 완료할 수 있어야 한다.
- light/dark 모두 텍스트·상태·focus indicator가 WCAG AA 대비를 충족해야 한다.
- 긴 제목, 긴 unbroken token, 태그 0/다수, 기사 0/다수, 시장/지수/클러스터 배열 0/다수에 대한 정책을 명시한다.
- motion을 제거해도 상태 변화와 정보 위계를 이해할 수 있어야 한다.
