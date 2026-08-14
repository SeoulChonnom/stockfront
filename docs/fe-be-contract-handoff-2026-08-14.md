# FE·BE 계약 통합 인수인계 (Task 9)

- **작성일**: 2026-08-14 (Asia/Seoul)
- **목적**: B1–B5 최종 계약을 통합한 프런트엔드와 백엔드의 후속 공동 릴리스 인수인계
- **배포 상태**: 이 문서 작성과 검증에서는 배포·push·PR을 수행하지 않았다.
- **증거 원칙**: 실행하지 않은 외부 provider 품질이나 digest는 주장하지 않는다.

## 1. 릴리스 기준점

### Backend (`../stockapp`)

- HEAD: `7e0b57c` (`docs: B4 검증 보고서 정합성 수정`)
- 계약 통합 범위: `25a4717^..7e0b57c`
  - B1 시작: `25a4717` (`feat: 일간 핵심 포인트 생성 및 저장`)
  - B5: `af15215` (`feat: 페이지 날짜 탐색 API 추가`)
  - B2 구조화 분석: `0346d1a`–`0d63751` 계열
  - B3 테마·아카이브: `19d5b52`–`7306eb9` 계열
  - B4 유사 기사 그룹: `49ea235`–`7e0b57c` 계열
- 현재 worktree에는 기존 사용자 소유의 `docs/backend-requests.md`가 untracked 상태로
  남아 있다. 이 인수인계 작업에서는 변경하지 않았다.

### Frontend (`../stockfront`)

- Handoff document commit at the start of this amendment: `966203c` (`docs: FE·BE 계약 통합 인수인계 정리`)
- Verified application/release-code baseline: `0d33956` (`test: FE 백엔드 계약 통합 검증`)
- Task 1–8 커밋 체인:

  `bf4a669` → `3f7fbab` → `919bb9b` → `e6ce7e7` → `b7a4ceb` →
  `eedbd00` → `5561114` → `0d33956`

  (각각 DTO, B5 navigation, B1 key points, B2 analysis, archive state, hierarchical
  filters, B4 grouping, regression verification.)

## 2. B1–B5 endpoint/contract 인수인계

| 영역 | 공개 endpoint | 최종 계약과 FE 동작 | 현재 증거 |
| --- | --- | --- | --- |
| **B1** 오늘의 핵심 | `GET /stock/api/pages/daily/latest`, `GET /stock/api/pages/daily?businessDate=`, `GET /stock/api/pages/{pageId}` | `DailyPageResponse.keyPoints`는 필수 배열이다. 정상 응답은 서버 순서 `direction → driver → watch`의 3개이고, 실패는 `[]`와 page-level `issues[]`다. `metadata.isLatest`와 페이지 `navigation`도 DTO에 포함된다. | `src/lib/api/types.ts`, `src/lib/mappers/market.ts`, `e2e/market-key-points.spec.ts`, backend `tests/api/test_pages.py` |
| **B2** 근거 기반 분석 | `GET /stock/api/news/clusters/{clusterId}` | `summary.analysis[]`는 제거됐다. `analysisStatus` (`READY`/`PARTIAL`/`UNAVAILABLE`), `analysisGeneratedAt`, `analysisIssues[]`, aggregate/문장 `conflictStatus`, `sections[] → paragraphs[] → sentences[]`를 사용한다. 문장 source ID는 같은 응답의 필수 `processedArticleId`를 가리키며 FE는 같은 화면 기사 행으로 focus한다. | `src/lib/mappers/cluster.ts`, `src/pages/cluster-detail/cluster-analysis.tsx`, `e2e/cluster-analysis.spec.ts`, backend `tests/api/test_clusters.py` |
| **B3** 테마·아카이브 | `GET /stock/api/pages/archive/themes`, `GET /stock/api/pages/archive` | 카탈로그는 재귀 `ThemeNodeResponse`다. archive query는 `marketType`, 반복 `theme`, `q`를 사용하며 `theme=A&theme=B`로 전송한다. 공개 status는 `READY`/`PARTIAL`만 허용하고 부모 theme의 하위 확장은 BE가 담당한다. FE는 최대 10개를 유지하고 `INVALID_THEME`/422는 서버 오류 패널로 전달한다. | `src/lib/api/archive.ts`, `src/pages/archive-search`, `e2e/archive-search.spec.ts`, backend `tests/api/test_archive_themes.py` |
| **B4** 유사 기사 그룹 | B2와 같은 `GET /stock/api/news/clusters/{clusterId}` 및 일간 page `markets[].articleLinks[]` | 서버는 평면 기사 배열을 반환한다. 각 기사는 `similarGroupId`, `isSimilarGroupRepresentative`, `exactDuplicateCount`를 필수로 갖고, `articleGrouping`은 `READY`/`UNAVAILABLE`와 생성 시각·issue를 가진다. FE는 필터/정렬 후 그룹을 재구성하고, exact duplicate만 `원문 중복 N건`으로 표시한다. `UNAVAILABLE`은 평면 목록과 비차단 안내이며 collapse를 표시하지 않는다. | `src/lib/mappers/cluster.ts`, `src/pages/cluster-detail`, `e2e/b4-article-grouping.spec.ts`, backend `tests/integration/test_article_grouping_mock_pipeline.py` |
| **B5** 인접 영업일 | `GET /stock/api/pages/navigation?businessDate=YYYY-MM-DD` | 응답은 `businessDate`, `pageExists`, `previousBusinessDate`, `nextBusinessDate`를 항상 포함한다. `pageExists=false`여도 실제 공개 페이지 기준 이웃을 사용한다. 이미 daily page가 있으면 embedded `navigation`만 사용하고, 날짜 없음 route에서만 standalone query를 사용한다. archive ±90일 계산/추측은 없다. | `src/lib/api/pages.ts`, `src/lib/query-hooks/use-adjacent-navigation.ts`, `e2e/routing.spec.ts`, backend `tests/api/test_pages.py` |

사람이 읽는 예시와 필드 불변식의 전체본은
[`docs/api_spec_doc.md`](./api_spec_doc.md)의 navigation·archive·theme·cluster 절에 있다.
현재 backend OpenAPI와 이 문서의 `docs/api-spec.json`은 아래 3절의 equality 검증으로 고정했다.

## 3. Smoke payloads (계약 조각)

아래는 새 endpoint와 상태를 빠르게 확인하기 위한 **관련 `data` 조각**이다. 공통
`success`/`meta` 봉투와 각 응답의 나머지 필수 필드는
[`docs/api_spec_doc.md`](./api_spec_doc.md)와 생성된 OpenAPI를 따른다.

### B1 — 성공/핵심 생성 실패

```json
{
  "keyPoints": [
    {"kind": "direction", "label": "시장 방향", "text": "시장 흐름이 혼조입니다.", "direction": "MIXED"},
    {"kind": "driver", "label": "주요 원인", "text": "금리와 수급이 주요 변동 요인입니다."},
    {"kind": "watch", "label": "관전 포인트", "text": "다음 발표와 외국인 수급을 확인합니다."}
  ],
  "issues": []
}
```

```json
{
  "keyPoints": [],
  "issues": [
    {"category": "AI_SUMMARY", "code": "KEY_POINTS_GENERATION_FAILED", "message": "오늘의 핵심 포인트를 준비하지 못했습니다."}
  ]
}
```

### B2 — READY, PARTIAL/FOUND, UNAVAILABLE/NOT_CHECKED

```json
{
  "analysisStatus": "READY",
  "analysisGeneratedAt": "2026-08-13T07:20:00Z",
  "analysisIssues": [],
  "conflictStatus": "FOUND",
  "sections": [{
    "kind": "background",
    "title": "발생 배경",
    "paragraphs": [{"sentences": [{
      "text": "관련 보도가 이어졌습니다.",
      "sourceArticleIds": [2001],
      "conflictStatus": "FOUND",
      "conflictingSourceArticleIds": [2002],
      "conflictNote": "기사별 전망이 다르게 보도됐습니다."
    }]}]
  }]
}
```

```json
{
  "analysisStatus": "PARTIAL",
  "analysisGeneratedAt": "2026-08-13T07:20:00Z",
  "analysisIssues": [{"code": "CONFLICT_CHECK_FAILED", "message": "일부 분석 문장의 충돌 근거를 확인하지 못했습니다."}],
  "conflictStatus": "NOT_CHECKED",
  "sections": [{
    "kind": "impact",
    "title": "시장 영향",
    "paragraphs": [{"sentences": [{
      "text": "남은 근거 문장은 정상적으로 표시됩니다.",
      "sourceArticleIds": [2001],
      "conflictStatus": "NOT_CHECKED",
      "conflictingSourceArticleIds": [],
      "conflictNote": null
    }]}]
  }]
}
```

`PARTIAL`은 실제 남은 section이 있는 fixture를 함께 확인해야 한다. 빈 `sections`와
`UNAVAILABLE`을 확인하는 smoke는 다음 조각을 사용한다.

```json
{
  "analysisStatus": "UNAVAILABLE",
  "analysisGeneratedAt": null,
  "analysisIssues": [{"code": "NO_GROUNDED_SENTENCES", "message": "근거를 확인할 수 있는 분석 문장이 없습니다."}],
  "conflictStatus": "NOT_CHECKED",
  "sections": []
}
```

### B3 — 카탈로그, 반복 theme, INVALID_THEME

```http
GET /stock/api/pages/archive/themes
```

```json
[{"code": "SECTOR", "label": "산업", "description": "산업별 시장 테마", "children": [
  {"code": "SECTOR_SEMICONDUCTORS", "label": "반도체", "description": "반도체 산업", "children": []}
]}]
```

```http
GET /stock/api/pages/archive?marketType=KR&theme=SECTOR&theme=MARKET_FLOW_INVESTOR&q=%EC%99%B8%EA%B5%AD%EC%9D%B8%20%EB%A7%A4%EC%88%98&page=1
```

알 수 없거나 비활성인 theme를 보내면 유효한 값만 골라 보내지 않고 전체 요청이
`422 INVALID_THEME`가 된다. FE의 카탈로그 로드 후 URL 정리와 기존 archive error panel을
확인한다.

### B4 — READY/UNAVAILABLE

```json
{
  "articleGrouping": {"status": "READY", "generatedAt": "2026-08-13T07:20:00Z", "issue": null},
  "articles": [
    {"processedArticleId": 2001, "similarGroupId": "sim-cluster-1", "isSimilarGroupRepresentative": true, "exactDuplicateCount": 2},
    {"processedArticleId": 2002, "similarGroupId": "sim-cluster-1", "isSimilarGroupRepresentative": false, "exactDuplicateCount": 0}
  ]
}
```

```json
{
  "articleGrouping": {
    "status": "UNAVAILABLE",
    "generatedAt": null,
    "issue": {"code": "SIMILARITY_GROUPING_FAILED", "message": "유사 기사 묶음을 생성하지 못했습니다."}
  }
}
```

### B5 — page 없는 날짜와 경계 날짜

```http
GET /stock/api/pages/navigation?businessDate=2026-08-13
```

```json
{
  "businessDate": "2026-08-13",
  "pageExists": false,
  "previousBusinessDate": "2026-08-12",
  "nextBusinessDate": "2026-08-14"
}
```

가장 오래된/최신 날짜는 각각 `previousBusinessDate: null`/`nextBusinessDate: null`을
확인한다. 네트워크 loading/error에서는 FE가 값을 추측하지 않고 양쪽 버튼을 비활성화한다.

## 4. OpenAPI equality

검증일에 backend HEAD에서 다음으로 임시 OpenAPI JSON을 생성하고, FE의
`docs/api-spec.json`과 JSON object equality를 비교했다.

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run python -c \
  "import json; from app.main import app; print(json.dumps(app.openapi(), sort_keys=True))" \
  > /tmp/stockapp-openapi-20260814.json
```

결과: `equal True`; 양쪽 모두 OpenAPI `3.1.0`, `13` paths, `63` component schemas.
이 비교는 문자열 formatting이 아니라 JSON object equality이며, backend는 read endpoint에서
AI provider를 호출하지 않는다.

## 5. Verification evidence

### Backend

| 명령 | 실제 결과 |
| --- | --- |
| `UV_CACHE_DIR=/tmp/uv-cache uv run pytest -q` | **1219 passed, 25 skipped**, 1 warning, 42.73s |
| `STOCKAPP_MIGRATION_TEST_DSN=<ephemeral postgres:17> UV_CACHE_DIR=/tmp/uv-cache uv run pytest -q tests/db/test_migrations_postgresql.py tests/integration/test_article_grouping_postgres.py` | **23 passed**, 2 warnings, 3.01s |
| Docker server check | `postgres:17` image / PostgreSQL 17; named local container was removed after the check |

The second command covers the B3 theme/search migration and Alembic paths plus B4 similarity
SQL/Alembic/persistence integration. Its embedding transport is `httpx.MockTransport`; no real
Ollama request was made.

Evaluation artifacts:

- [B3 theme enrichment evaluation](../../stockapp/docs/evaluations/2026-08-13-theme-enrichment.md): historical deterministic Gemini mock replay; its recorded decision is `CANDIDATE_B_REQUIRED`, not live Gemini quality evidence.
- [B4 article similarity evaluation](../../stockapp/docs/evaluations/2026-08-13-article-similarity.md): decision/status is **`MOCK_PIPELINE_PASS_REAL_BGE_M3_CALIBRATION_REQUIRED`**. Mock arithmetic gates pass; real `bge-m3` calibration remains required.

### Frontend

| 명령 | 실제 결과 |
| --- | --- |
| `pnpm test -- --reporter=dot` | **64 files, 612 passed** |
| `pnpm e2e -- --reporter=line` | **181 passed, 0 failed** in 51.6s; Mock API only |
| `pnpm lint` | **219 files, no issues** |
| `pnpm build` | `tsc -b` and Vite production build passed |
| `pnpm run knip` | Exit 1 on the known 20-item baseline below; no new item appeared in this run |

Knip baseline (20 items):

- 1 unused devDependency: `@biomejs/biome`
- 1 unlisted binary: `biome`
- 18 unused exported DTO types: `PaginationResponse`, `PageStatusResponse`,
  `PageNavigationResponse`, `KeyPointDirectionResponse`, `PageIssueResponse`,
  `PageVersionSummaryResponse`, `MarketAnalysisResponse`, `MarketMetadataResponse`,
  `MarketSectionResponse`, `RepresentativeArticleResponse`, `ClusterCardResponse`,
  `ArchiveItemResponse`, `ArticleGroupingIssueResponse`, `ArticleGroupingResponse`,
  `ClusterSentenceResponse`, `ClusterParagraphResponse`, `ClusterSectionResponse`,
  `ClusterSummaryResponse`.

The frontend Playwright suite uses `e2e/fixtures/mock-api.ts`; no frontend request reaches
Gemini or Ollama in this verification.

## 6. Ollama gate and required runtime values

The application settings define these live B4 values:

```text
STOCKAPP_OLLAMA_BASE_URL=http://localhost:11434   # default; must point to the Ollama service
STOCKAPP_OLLAMA_EMBED_MODEL=bge-m3                # required model name
STOCKAPP_OLLAMA_TIMEOUT_SECONDS=30                # default, > 0
STOCKAPP_OLLAMA_MAX_RETRIES=2                     # default, bounded 0..2
STOCKAPP_SIMILARITY_INPUT_CHARS=2048              # default, > 0
```

The repository evaluation JSON records `bge_m3_model_digest: "NOT_COLLECTED BY THIS SCRIPT"`
and the markdown report records the digest as not collected in mock mode. No local `ollama`
executable/service was available during this handoff, and this task explicitly did not run a
real provider. Therefore a verified production `bge-m3` digest is **not available** and must be
collected by the operator during the real calibration gate. Do not treat the mock model label or
the MockTransport tests as digest evidence. The current quality status is exactly:

`MOCK_PIPELINE_PASS_REAL_BGE_M3_CALIBRATION_REQUIRED`

## 7. Migration and operations notes

- SQL contract sequence for this coordinated change is **08 then 09**:
  `db/migrations/20260813_08_theme_catalog_archive_search.sql` (B3), then
  `db/migrations/20260813_09_article_similarity_groups.sql` (B4). The page-search SQL is
  `db/migrations/20260814_09_page_search_document.sql` and is applied by its Alembic revision
  before the article-similarity revision.
- Runtime Alembic chain is `20260814_01_theme_archive_search` →
  `20260814_02_page_search_document` → `20260814_03_article_similarity_groups` (head at the
  verified backend). Inspect a deployed database with `uv run alembic current`.
- `db/schema_postgresql.sql` is the desired-schema source of truth. After Alembic adoption, the
  seven legacy SQL files are an immutable archive and must not be replayed against an adopted
  database. Future revisions must update the canonical schema and test both fresh and previous
  heads.
- Normal startup keeps `STOCKAPP_DATABASE_MIGRATION_ENABLED=true`; startup serializes migration
  work with a PostgreSQL advisory lock and aborts before batch recovery if migration fails. A
  separate controlled release job may own migrations only when the setting is disabled for the
  API instances.
- Before changing execution mode, stop any separately deployed durable worker. The documented
  deployment shape is one API container with one Uvicorn worker; external failure notifications
  are not configured by this service.

## 8. Coordinated later rollout (not executed)

This is a release sequence, not a new migration/deprecation policy. It intentionally adds no
legacy dual-read/dual-write logic:

1. Hold the paired artifacts at FE `0d33956` and BE `7e0b57c`; confirm both repositories and
   `docs/api-spec.json` are the intended versions.
2. Preflight the canonical `stock` database and apply the migration chain in the documented
   order (B3/08 then B4/09; Alembic head controls runtime ordering). Do not replay the frozen
   legacy archive after adoption.
3. Complete the real B4 `bge-m3` calibration and record Ollama version and model digest. The
   mock quality status is not a production acceptance gate.
4. Release BE and FE as one coordinated contract change. Run the B1–B5 smoke payloads above,
   confirm repeated `theme` query keys, confirm page navigation does not query archive windows,
   and confirm read endpoints do not invoke AI providers.
5. Observe migration completion, API error rates, archive 422 handling, analysis/grouping state
   distribution, and navigation responses before declaring the coordinated release healthy.
6. If rollback is required, roll back the **coordinated FE+BE release pair** to its previous
   known pair and follow the database operator’s forward/rollback procedure for the applied
   migration. This handoff does not authorize a one-sided FE or BE rollback and does not define
   a legacy compatibility window.

## 9. Final status

- Frontend gates: verified at `0d33956` (612 Vitest, 181 Mock Playwright, build/lint pass).
- Backend full suite: verified at `7e0b57c` (1219 passed, 25 skipped).
- Local Docker (`postgres:17` image) / PostgreSQL 17 B3/B4 validation: completed and container removed.
- OpenAPI: backend-generated object equals frontend `docs/api-spec.json`.
- Known limitation: real `bge-m3` calibration and digest collection remain required.
- Deployment: **not performed**.
