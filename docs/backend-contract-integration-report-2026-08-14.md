# 백엔드 계약 연동 결과 보고서 (B-1 · B-2 · B-4 · B-5)

- **작성일**: 2026-08-14
- **범위**: `docs/backend-requests-2026-08-12.md` 부록 A(확정 계약) B-1 · B-2 · B-4 · B-5
- **기준**: 본 문서의 모든 수치는 실제 명령 출력에서 가져온 것이다. 얻지 못한 항목은 얻지 못했다고 적었다.

---

## 1. 구현 완료

### B-5. 인접 영업일 (기존 D-05)

`GET /stock/api/pages/navigation` 엔드포인트 연동. 일간 페이지 응답의 `navigation` 블록도 사용한다.

**변경 사항**

- 기존 아카이브 ±90일 우회 훅(`use-adjacent-snapshot-dates.ts`)은 삭제하고 `use-adjacent-navigation.ts`로 교체
- 상태 기계(`loading`/`error`/`ready`)로 "이웃이 없음(null)"과 "아직 모름"을 구분하여, 로딩·오류에는 양쪽 버튼을 비활성화한다
- 이미 페이지를 로드한 화면은 응답의 `navigation`을 쓰고 별도 호출을 하지 않는다 (테스트로 고정)
- 쿼리 키는 `['navigation', businessDate]`로 아카이브 캐시와 분리
- `docs/backend-dependencies.md`의 D-05 항목은 해결되어 제거함

### B-1. 오늘의 핵심

`DailyPageResponse.keyPoints`(`kind` 판별 유니온, `direction`은 `kind: 'direction'`에만 포함) + 페이지 레벨 `issues[]` 추가.

**변경 사항**

- 매퍼에서 "정확히 3개 + `direction`→`driver`→`watch` 순서"가 아니면 `[]`로 정규화해 UI 조건을 하나로 만듦
- 신규 컴포넌트 `key-points-block.tsx`: 빈 배열이면 제목 포함 섹션 전체 미렌더
- 서버 고정 `label` 그대로 사용
- 방향은 색·아이콘이 아니라 한국어 텍스트(`상승`/`하락`/`혼조`/`보합`)로 노출
- `KEY_POINTS_GENERATION_FAILED`는 `partial-banner.tsx`에서 일반 AI 요약 실패와 구분해 안내

### B-2. 구조화 클러스터 분석

`summary.analysis: string[]` 제거(파괴적 변경). `sections[] → paragraphs[] → sentences[]` 4단 계층으로 교체.

**변경 사항**

- 서버가 준 `title`을 그대로 쓰고 본문에서 섹션 종류를 추론하지 않는다
- `UNAVAILABLE`이면 분석 영역 전체를 안내 상태 하나로 대체하되 `summary.short`/`long`은 유지
- `PARTIAL`은 정상 렌더 + `analysisIssues[]` 기반 비차단 안내
- 분석 시각은 `lastUpdatedAt`이 아니라 `analysisGeneratedAt`을 사용
- 문장 단위 근거 기사는 외부 이동이 아니라 같은 화면의 기사 행으로 스크롤·포커스하는 버튼
- `conflictStatus: FOUND`는 오류가 아닌 정보로 표시 (경고 색·아이콘 없이)
- `NOT_CHECKED`를 "충돌 없음"으로 표현하지 않음

### B-4. 유사 기사 그룹

`articleGrouping` + 기사별 `similarGroupId` / `isSimilarGroupRepresentative` / `exactDuplicateCount` 연동.

**변경 사항**

- 서버는 평면 배열을 유지하고 FE가 그룹을 만든다
- 언론사 필터·제목 검색·정렬을 적용한 뒤 그룹을 재구성
- 서버 대표가 걸러지면 남은 기사 중 서버 순서상 첫 번째를 대표로 사용 (점수 재계산 없음)
- 보이는 기사가 1건인 그룹에는 토글이 없음
- 20건 추가 로딩은 그룹 경계에서 끊음
- `exactDuplicateCount`는 0보다 클 때만 "원문 중복 N건"으로 표시하며 유사 그룹의 기사 수와 혼동하지 않음
- `UNAVAILABLE`은 평면 렌더 + 비차단 안내 하나이고 페이지 상태를 `PARTIAL`로 바꾸지 않음
- `article-focus-event.ts`(CustomEvent 브리지)로 접힌 그룹 안의 기사에도 B-2 근거 참조가 도달
- 일간 페이지 `markets[].articleLinks[]`에도 같은 중복 표시 규칙을 적용

---

## 2. 후속 작업 완료 (2026-08-15 현재)

본 보고서 작성 이후 아래 네 항목이 모두 해결되었다. 후속 기준 문서는 `docs/fe-be-contract-handoff-2026-08-14.md`를 참조할 것.

### B-3. 계층형 테마·아카이브 검색 — **해결**

커밋 `b7a4ceb` (아카이브 테마 검색 상태), `eedbd00` (계층형 테마 복수 검색 UI)에서 구현됨. 재귀 테마 트리, 반복 `theme` URL 파싱·순서 유지 중복 제거·10개 절단, 필터 변경 시 `page` 리셋, 카탈로그 로딩 후 한 번의 replace-state 정리, 쿼리 키 테마 순서 정규화까지 포함.

### 반복 쿼리 파라미터 직렬화 — **해결**

커밋 `bf4a669`에서 `src/lib/api/client.ts`의 `buildQueryString`이 `string[]`을 받아 `append`로 반복 키를 만듦. 같은 문제가 있던 `src/lib/router.ts`의 `buildUrl`도 함께 고쳐짐 (커밋 `b7a4ceb`).

### A-7 잔여 항목 — **해결**

커밋 `b7a4ceb`, `eedbd00`에서 아카이브 검색 화면에서 `status=FAILED` 제거됨. `src/lib/mappers/archive.ts`의 `toUpperStatus` 허용 목록에 남은 `FAILED`는 의도적 방어 코드임 (다른 경로에서는 여전히 올 수 있음).

### `docs/api-spec.json` — **갱신됨**

커밋 `bf4a669`에서 신규 필드 모두 반영되어 DTO와 스펙이 일치함.

---

## 3. 테스트 결과

2026-08-14 현재 실제 실행한 출력이다.

| 명령 | 결과 |
|---|---|
| `pnpm test` | **542 통과** |
| `pnpm build` | **통과** (`tsc -b && vite build`) |
| `pnpm lint` | **이슈 없음** |
| `pnpm exec playwright test` | **177건 중 176 통과** (실패 1건은 작업 이전부터 존재하던 스크롤 복원 타이밍 문제) |

### 사전 존재 실패 항목

`routing.spec.ts`의 "Back from a cluster detail page restores the selected tab and scroll position" — 이번 작업 이전부터 존재하던 스크롤 복원 타이밍 문제이며 변경 사항과 무관함(작업 전 baseline에서 동일하게 재현 확인).

---

## 4. 변경된 파일 및 컴포넌트 목록

### 신규 파일

| 경로 | 역할 |
|---|---|
| `src/lib/query-hooks/use-adjacent-navigation.ts` | B-5: 인접 영업일 조회 |
| `src/components/market-brief/key-points-block.tsx` | B-1: 오늘의 핵심 렌더링 |

### 삭제 파일

- `src/pages/market-overview/use-adjacent-snapshot-dates.ts` (B-5 우회 훅 폐기)

### 주요 수정 파일

`src/lib/mappers/cluster.ts`, `src/lib/mappers/market.ts` (B-1/B-2/B-4 매퍼) · `src/lib/view-models.ts`, `src/lib/api/types.ts` (DTO) · `src/pages/cluster-detail-page.tsx`, `src/components/cluster/` (B-4 그룹 렌더링) · `src/lib/query-hooks.ts` (B-5 쿼리 추가) · 관련 테스트 스펙 다수.

---

## 5. 기존 동작에 영향을 줄 수 있는 변경 사항

1. **문장 단위 근거 참조**: B-2 분석의 각 문장이 근거 기사 ID 목록을 가지게 된다. 기존 단락 단위 설계와 다르다.
2. **`ArticleGrouping` 타입**: B-4 연동으로 신규 타입이 추가되며, `ClusterDetail`은 이를 필수로 포함한다.
3. **`analysisGeneratedAt` vs `lastUpdatedAt`**: 분석 블록은 생성 기준 시각(`analysisGeneratedAt`)을 쓰므로 시간 표시가 변할 수 있다.
4. **`KEY_POINTS_GENERATION_FAILED` 구분**: 페이지 레벨 이슈에서 핵심 생성 실패와 일반 AI 요약 실패를 별도로 구분한다.
5. **기존 `analysis[]` 직렬화 방식 폐기**: 프런트에서 `summary.analysis` 배열을 직접 렌더링하던 코드는 깨진다 (`sections[]`으로 마이그레이션).

---

## 6. 검증 불확정 항목

- **실제 스크린리더 검증**: 페이지 수준 이슈 안내와 충돌 정보 표시가 스크린리더에서 어떻게 낭독되는지는 검증하지 않았다.
- **모바일 토글 UI**: B-4 그룹 토글이 모바일 환경에서 충분히 스타일링되었는지 스크린샷 없이 단언하지 않았다.
- **API 스펙 커버리지**: `docs/api-spec.json`이 갱신되지 않아 신규 필드들의 공식 문서화를 확인하지 못했다.
