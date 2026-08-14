# FE Task8 백엔드 계약 통합 검증 보고서

- 검증일: 2026-08-14 (Asia/Seoul)
- 기준 커밋: `5561114816bb09391099da5b54b5bd666598d50c` (`feat: 유사 기사 그룹 UI 적용`)
- 범위: Tasks 1–7 결과에 대한 프런트 통합 회귀 검증 및 Task8 테스트 보강
- 실행 모드: Playwright Mock API만 사용. 실제 백엔드, Gemini, Ollama, 배포는 실행하지 않음.

## 결론

Task8 범위의 결정적 회귀는 확인되지 않았다. 기존에 반복 실패하던 라우팅 스크롤 복원 테스트는 제품 코드 회귀가 아니라 테스트의 클릭 동작이 저장 대상 링크를 자동 스크롤하던 결정적 테스트 결함이었다. 테스트가 의도한 400px 대신 Playwright의 `locator.click()`이 부분적으로 보이던 링크를 425px 위치로 먼저 이동시켰고, URL 변경 직후 `goBack()`을 호출해 클러스터 상세 요청을 취소시키기도 했다. DOM `dispatchEvent('click')`으로 저장 직전 자동 스크롤을 제거하고 상세 제목이 표시될 때까지 기다리도록 고친 뒤 10회 반복 및 전체 E2E에서 통과했다.

## 변경 사항

- `e2e/routing.spec.ts`
  - 스크롤 복원 시나리오를 자동 스크롤이 없는 DOM 클릭으로 실행
  - 클러스터 상세의 `AI 심층 분석` 제목을 기다린 후 Back 수행
  - 5xx 오류 셸의 standalone navigation 요청에서 `businessDate`가 정확히 한 번 전송되는 브라우저 네트워크 스모크 추가
- `e2e/archive-search.spec.ts`
  - 부모/자식 테마를 함께 선택한 검색의 실제 archive 요청을 캡처
  - 반복 query key가 `theme=SECTOR&theme=MARKET_FLOW_INVESTOR` 순서와 값으로 전송되는지 검증
- 이 보고서
  - 명령별 결과, 결정적 실패 진단, stale legacy 참조 감사 결과를 기록

## 최종 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm test` | PASS — 64 files, 612 passed |
| 계약 집중 테스트 (`src/lib/api/client.test.ts`, `archive.test.ts`, `pages.test.ts`, `query-hooks.test.tsx`) | PASS — 4 files, 29 passed |
| `pnpm lint:fix` | PASS — 포맷 1건 정리 |
| `pnpm lint` | PASS — 219 files, issues 0 |
| `pnpm build` | PASS — TypeScript 및 Vite production build 완료 |
| `pnpm run knip` | BASELINE FAIL — 아래 20건, 신규 실행 코드 오류 아님 |
| 대상 archive/routing E2E | PASS — 28 passed |
| 스크롤 복원 테스트 `--repeat-each=10` | PASS — 10 passed |
| 전체 Playwright E2E (`pnpm exec playwright test --reporter=line`) | PASS — 181 passed, 0 failed (51.6s) |

### Knip baseline

`pnpm run knip`은 exit 1이며 다음 기존 정리 대상만 보고했다.

- unused devDependency 1: `@biomejs/biome`
- unlisted binary 1: `biome`
- unused exported API DTO types 18: `PaginationResponse`, `PageStatusResponse`, `PageNavigationResponse`, `KeyPointDirectionResponse`, `PageIssueResponse`, `PageVersionSummaryResponse`, `MarketAnalysisResponse`, `MarketMetadataResponse`, `MarketSectionResponse`, `RepresentativeArticleResponse`, `ClusterCardResponse`, `ArchiveItemResponse`, `ArticleGroupingIssueResponse`, `ArticleGroupingResponse`, `ClusterSentenceResponse`, `ClusterParagraphResponse`, `ClusterSectionResponse`, `ClusterSummaryResponse`

이 항목들은 이번 Task8에서 삭제하거나 숨기지 않았다.

## Stale/legacy 참조 감사

- `summary.analysis`: 런타임 클러스터 요약 렌더러는 사용하지 않는다. 현재 `summary.analysisStatus`, `summary.analysisIssues`, `summary.sections` 계열 계약만 사용한다. 검색 결과의 `markets[].analysis`는 별도 시장 분석 필드이며 stale 클러스터 경로가 아니다. 과거 계약을 설명하는 문서/fixture 주석의 문자열은 동작 참조가 아니다.
- `processedArticleId`: 공개 API 타입은 필수 `number`다. `processedArticleId?` 타입은 없으며, mapper의 숫자/중복 검사는 손상된 외부 응답을 안전하게 걸러내는 계약 경계 방어로 유지했다.
- 공개 archive `FAILED` 필터: `src/pages/archive-search/filter-copy.ts`의 허용 상태와 옵션은 `READY`/`PARTIAL`만이다. `ArchiveResultsTable`에도 공개 결과용 FAILED 전용 danger 분기가 없다. 남은 `FAILED` 경로는 운영 배치 상태, 명시적 상세 조회, 오류/fixture/방어 테스트에 해당한다.
- 구식 grouping fallback: `DEFAULT_GROUPING` 같은 이전 기본 prop은 제거되어 있다. `articleGrouping.status !== READY`일 때 singleton 목록을 보여주고, 누락된 issue message에 일반 안내를 쓰는 현재 fallback은 B-4/A-5 계약의 `UNAVAILABLE` 방어 렌더이며 legacy grouping prop 경로가 아니다.
- navigation/window 경로: 화면 간 in-app 이동은 `navigate()`와 history 기반 router를 사용한다. `window.location` 사용은 인증 redirect, 현재 URL 읽기, 명시적 reload, origin query 읽기처럼 브라우저 전역이 필요한 경계뿐이다. 내부 화면 이동을 `window.location`으로 우회하는 stale 경로는 확인되지 않았다.

## 범위 밖/주의 사항

초기 병렬 Playwright 실행 중 `reuseExistingServer`를 공유한 오염된 실행에서 connection-refused가 발생했지만, 해당 결과는 서버 중복 실행으로 인한 것이어서 최종 증거로 사용하지 않았다. 이후 단일 서버의 새 실행을 완료했고, 최종 전체 결과는 181/181 통과다. 테스트 skip, retry 의존, assertion 완화는 추가하지 않았다.
