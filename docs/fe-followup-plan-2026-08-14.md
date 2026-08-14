# FE 후속 작업 계획 (2026-08-14 기준)

> **상태** — 이 계획의 모든 작업이 **완료됨**. 이 문서는 기록으로 남겨둔다. 후속 기준 문서는
> `docs/fe-be-contract-handoff-2026-08-14.md`. 아래 적힌 미완료 항목을 그대로 착수하면 안 된다.

- **목적** — 2026-08-14에 B-1 · B-2 · B-4 · B-5를 연동한 뒤 **남은 작업을 다음 세션이 맨바닥에서
  시작할 수 있도록** 정리한 문서다. 무엇이 왜 남았는지, 어느 파일 어느 줄부터 손대면 되는지,
  무엇을 검증해야 끝난 것인지를 담는다.
- **읽는 순서**
  1. 이 문서의 §1 (현재 상태) — 지금 코드가 어디까지 와 있는지
  2. `docs/backend-requests-2026-08-12.md` **부록 A** — 확정 계약 전문. 모든 판단의 기준이다
  3. `docs/backend-contract-integration-report-2026-08-14.md` — 이번에 구현된 내용의 결과 보고
  4. 이 문서의 §2~§5 — 남은 작업 각각의 착수 지점
- **전제** — 부록 A는 계약이고, 값이 채워졌는지와는 별개다. 최종 판정은 백엔드가 생성하는
  OpenAPI 스펙이며 `docs/api-spec.json`은 **갱신되었다**(커밋 `bf4a669`에서 신규 필드 반영).

---

## 1. 현재 상태

### 완료 (2026-08-14)

| 항목 | 상태 | 비고 |
|---|---|---|
| B-1 오늘의 핵심 (`keyPoints`) | 완료 | 실데이터로 동작 |
| B-2 구조화 클러스터 분석 | 완료 | 실서버는 아직 전부 `UNAVAILABLE` |
| B-4 유사 기사 그룹 | 완료 | 실서버는 아직 placeholder 고정값 |
| B-5 인접 영업일 | 완료 | 실데이터로 동작. ±90일 우회 제거됨 |

### 남은 작업 (2026-08-15 기준 전부 완료)

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| §2 | 반복 쿼리 파라미터 직렬화 | **완료** | 커밋 `bf4a669` (`buildQueryString`), `b7a4ceb` (`buildUrl`) |
| §3 | B-3 계층형 테마·아카이브 검색 | **완료** | 커밋 `b7a4ceb` (아카이브 테마 검색 상태), `eedbd00` (계층형 테마 복수 검색 UI) |
| §4 | A-7 잔여 — 공개 아카이브 `status=FAILED` 제거 | **완료** | 커밋 `b7a4ceb`, `eedbd00` |
| §5 | OpenAPI 갱신 후 DTO 재검증 | **완료** | 커밋 `bf4a669`에서 `docs/api-spec.json` 갱신됨 |

### 착수 순서

**§2 → §4 → §3 → §5** 의 순서로 모두 완료되었다.

- §2는 §3 없이도 단독으로 완결되고, §3의 어떤 UI보다 먼저 필요하다.
- §4는 §3과 파일이 겹치므로(둘 다 아카이브 검색 화면) §3 착수 직전에 끝내 두면 충돌이 없다.
  실제로도 두 항목이 같은 커밋 묶음에서 함께 처리됐다.
- §5는 백엔드가 스펙을 갱신한 뒤 언제든.

### 작업 시작 전 확인 (작성 당시 기준 — 지금은 모두 해소됨)

- 2026-08-14 변경분은 당시 **커밋되지 않은 상태**였다. 이후 커밋됐다.
- 당시 알려진 사전 존재 실패 2건.
  - `pnpm exec playwright test` — `routing.spec.ts`의 "Back from a cluster detail page restores
    the selected tab and scroll position" 1건 (스크롤 복원 타이밍). **2026-08-15 확인 시
    181건 전부 통과해 이 실패는 사라졌다.**
  - `pnpm run knip` — `@biomejs/biome` devDependency, `biome` 바이너리 2건
    (`AGENTS.md`에 기존 항목으로 명시돼 있다). 이 2건은 그대로 남아 있는 정상 baseline이다.

---

## 2. 반복 쿼리 파라미터 직렬화 — **완료** (커밋 `bf4a669`, `b7a4ceb`)

부록 A-4-3이 **B-3 착수 전에 확인하라**고 명시한 항목이었다. 확인 결과 당시 클라이언트는
반복 파라미터를 만들 수 없었다. 아래는 그때의 진단과 지침이며, **지금은 해결돼 있다.**

### 문제 (당시)

`src/lib/api/client.ts`

- `QueryValue`(6행)가 `string | number | boolean | null | undefined` — 배열을 받지 못한다.
- `buildQueryString`(86행)이 `params.set(key, String(value))`를 쓴다. 같은 키를 두 번 넣으면
  **뒤엣값이 앞엣값을 덮는다.**

배열을 넘기려고 `String(['A','B'])`가 되면 `theme=A,B`가 만들어지고, 서버는 이것을 **하나의
테마 코드 `"A,B"`로 해석해 `422 INVALID_THEME`을 낸다**(부록 A-4-3).

### 요구 동작

```
theme=SECTOR_SEMICONDUCTORS&theme=CORPORATE_EVENT_PERFORMANCE   // O
theme=SECTOR_SEMICONDUCTORS,CORPORATE_EVENT_PERFORMANCE          // X → 422
```

### 변경 지침

- `QueryValue`에 `string[]`을 추가한다.
- `buildQueryString`에서 배열이면 원소마다 `params.append`를 호출한다. **원소 순서를 보존**한다.
- 빈 배열은 키 자체를 생략한다(기존의 `null`/`undefined`/`''` 생략 규칙과 같은 취급).
- **스칼라 경로의 동작은 바꾸지 않는다.** 기존 호출자(`archive`, `batch`, `pages`)가 전부
  이 함수를 지나간다.
- 배열 원소 중 빈 문자열이 섞였을 때의 처리를 정하고 테스트로 고정한다(생략을 권한다).

### 검증

`src/lib/api/client.test.ts`에 추가:

- 배열 → 반복 키로 직렬화되고 순서가 보존된다
- 빈 배열 → 키가 아예 없다
- 스칼라·`null`·`undefined`·빈 문자열의 기존 동작이 그대로다

> 이 변경만으로는 화면 동작이 달라지지 않는다. knip이 새 export를 잡지 않는지만 확인하면 된다.

---

## 3. B-3 계층형 테마 · 아카이브 검색 — **완료** (커밋 `b7a4ceb`, `eedbd00`)

**당시 차단 상태** — `GET /stock/api/pages/archive/themes`가 없었고, `GET /stock/api/pages/archive`는
`fromDate` · `toDate` · `status` · `page` · `size`만 받았다. 이후 백엔드가 두 가지를 모두
제공했고 FE도 연동을 마쳤다. 아래 항목들은 **그때 세운 착수 지침을 기록으로 남긴 것**이다.

기준 문서는 부록 **A-4 전체**(A-4-1 ~ A-4-9)다. 아래는 그 계약을 이 코드베이스의
착수 지점에 매핑한 것이다.

### 3-1. 테마 카탈로그 API

- `src/lib/api/archive.ts`에 `getArchiveThemes` 추가.
- 타입은 **재귀 구조**이며 `children`은 리프에서도 항상 배열이다(`null` 아님).
- **트리 컴포넌트를 3단계로 하드코딩하지 말 것.** 초기 데이터는 3단이지만 API와 DB는 임의
  깊이를 지원한다(A-4-2).
- `label` · `description`은 **이 API에서만** 얻는다. 코드→한글 매핑을 FE에 하드코딩하지 않는다.
- 정렬은 서버가 계층별로 끝내서 준다. **FE에서 재정렬하지 않는다.**

### 3-2. 아카이브 검색 파라미터

- `src/lib/api/archive.ts:4` `ArchiveListParams`에 `q` · `marketType` · `theme: string[]` 추가.
- `theme`은 §2가 끝나야 올바르게 직렬화된다.
- `status`는 `'READY' | 'PARTIAL'`로 좁아진다 — §4와 같은 변경이다.

### 3-3. URL 상태 (`src/lib/app-state.ts`)

현재 `ListFilters`(9~13행)는 `from` · `to` · `status` · `page` 4개뿐이다. `market` · `themes` ·
`q`를 추가하고 `parseListFilters`(67~90행)에서 파싱한다. 지켜야 할 규칙(A-4-8):

- 반복 `theme` 값을 **순서를 유지한 채 중복 제거**하고 **10개에서 자른다.**
- **필터가 바뀌면 `page`를 1로 리셋**한다.
- URL로 들어온 **모르는 테마 코드는 카탈로그 로딩 전까지 보존**한다(로딩 중이라 모르는 것일 수
  있다). 카탈로그를 받은 뒤 비활성·미지 코드를 **한 번의 replace-state로 정리**한다.
  모르는 코드를 계속 전송하면 계속 422가 난다.

### 3-4. 쿼리 키 정규화 — 주의

`src/lib/query-hooks.ts:88` `useArchiveList`의 키가 `['archive-list', params]`로 **params 객체를
그대로 넣는다.** 테마 배열의 순서만 다른 같은 선택 조합이 서로 다른 캐시 엔트리가 된다.
A-4-8이 요구하는 대로 **키를 만들 때 테마 순서를 정규화**해야 한다(서버로 보내는 값의 순서와
캐시 키의 순서는 별개로 다뤄도 된다).

`src/pages/archive-search-page.tsx:97`에도 필터를 문자열로 합치는 별도 키가 있다
(`${from}:${to}:${status}:${page}`). 새 필드를 추가할 때 여기도 같이 손봐야 한다.

### 3-5. 필터 결합 규칙 (문구 작성에 직결)

- 복수 `theme`끼리는 **OR**, 서로 다른 종류의 필터끼리는 **AND**.
- **부모 테마를 보내면 서버가 하위까지 확장한다. FE가 자식 코드를 URL에 나열하면 안 된다.**
- 알 수 없거나 비활성인 코드가 **하나라도** 있으면 요청 전체가 `422 INVALID_THEME`이다.
  유효한 것만 골라 보내지 않는다.
- `q`는 "정확한 토큰 전부 포함" 검색이다(유사어·오타 교정·동의어 확장 없음). 그래서 **결과가
  없을 때 "더 짧은 키워드로 검색해 보세요"가 실제로 유효한 안내**다.
- 테마를 함께 지정하면 결과가 눈에 띄게 줄어들 수 있고 **이것은 정상이다**(A-4-6). 결과 없음
  문구에 적용된 필터를 함께 보여준다.

### 3-6. `q` 클라이언트 힌트

서버 정규화 순서는 NFC → casefold → 공백 축약 → 길이 2~100자 → 토큰 최대 10개 → 전 토큰 AND
(A-4-5). 같은 기준으로 클라이언트 힌트를 주면 불필요한 422를 줄일 수 있다. 다만 **최종 판정은
서버 422**이므로, 거부되면 그 메시지를 기존 아카이브 오류 패널에 노출한다.

### 3-7. UI

- 트리 체크박스는 **재귀 컴포넌트**로. 키보드 조작이 가능해야 하고 라벨은 계층 전체를 알 수
  있게 연결한다.
- **11번째 선택은 막고 왜 막혔는지 문구로 안내**한다. 조용히 무시하면 안 된다.
- 카탈로그 로딩·오류 상태를 만든다.
- **`GENERAL` · `OTHER` · `기타` 같은 미분류 옵션을 FE에서 만들지 않는다.** 그런 테마 코드는
  존재하지 않는다(A-4-2).
- 테이블 쿼리와 페이지네이션 링크 **양쪽에 동일한 필터를 전달**한다.

### 3-8. 제거 대상

- 자유 `tags[]`를 아카이브 필터값으로 넘기는 코드가 있으면 제거한다(A-4-9). 태그는 LLM이 붙인
  표시용 문자열이고 테마는 사람이 정의한 고정 카탈로그다. **두 체계는 별개다.**
  (2026-08-14 확인 시점에는 그런 호출이 없었다. 착수 시 다시 확인할 것.)

### 3-9. 테스트

부록 A-4 "준비할 테스트 케이스" 전체 — 중첩 렌더 / 복수 선택 / 부모 선택 시 자식 코드를 URL에
넣지 않음 / 10개 초과 방지 문구 / 시장 선택 / `q` 입력 / 전체 해제 / 브라우저 뒤·앞으로 복원 /
카탈로그 로딩·오류 / `INVALID_THEME` 패널 / 결과 없음 문구의 적용 필터 표시 / 쿼리 키 정규화.

---

## 4. A-7 잔여 — 공개 아카이브 `status=FAILED` 제거 — **완료** (커밋 `b7a4ceb`, `eedbd00`)

**작성 당시 사용자에게 보이던 문제였다.** 서버는 공개 조회(`/archive`, `/daily`,
`/navigation`)에서 `FAILED` 버전을 완전히 제외하는데(A-1-9), 검색 화면에는 `FAILED` 옵션이
남아 있어 선택하면 항상 빈 결과가 나왔다. 지금은 옵션이 제거됐다.

### 착수 지점

| 파일 | 위치 | 할 일 |
|---|---|---|
| `src/pages/archive-search/filter-copy.ts` | 10행 `ARCHIVE_SEARCH_STATUSES` | `FAILED` 제거 |
| `src/pages/archive-search/filter-copy.ts` | 16행 `STATUS_OPTIONS` | `FAILED · 생성 실패` 옵션 제거 |
| `src/pages/archive-search-page.tsx` | 106행 `allowedStatuses` | 위 상수를 쓰므로 자동 반영. 동작 확인만 |
| `src/pages/archive-search/archive-results-table.tsx` | 138행 | `FAILED` 전용 `tone='danger'` 분기 제거 |

### 지켜야 할 것

- **운영 화면은 변경하지 않는다.** `src/pages/batch-operations-page.tsx:67`의 `BATCH_STATUSES`는
  별개 체계다. 배치 잡의 `FAILED`는 그대로 유효하다.
- **알 수 없는 상태에 대한 방어 렌더는 유지한다**(A-7 "단 알 수 없는 상태에 대한 방어 렌더는
  유지"). `src/lib/mappers/archive.ts:23`의 `toUpperStatus(item.status, [...])` 허용 목록을
  줄일지는 신중히 판단할 것 — `pageId` 직접 조회 경로에서는 `FAILED`가 여전히 올 수 있다.
  목록 응답과 상세 응답을 같은 잣대로 좁히지 말 것.
- 기존 북마크(`?status=FAILED`)는 `normalizeStatusParam`(`src/lib/app-state.ts:52`)이 허용
  목록에 없는 값을 `''`로 떨어뜨리므로 **전체 조회로 안전하게 열린다.** 이 동작을 테스트로
  고정해 두면 좋다.

---

## 5. OpenAPI 갱신 후 DTO 재검증 — **완료** (커밋 `bf4a669`)

`docs/api-spec.json` 갱신 후 아래를 대조했고, 전 항목이 일치함을 확인했다.
**부록 A와 스펙이 어긋나면 스펙이 이긴다**(A-8)는 원칙은 앞으로도 그대로다.

| 확인 대상 | 기대 |
|---|---|
| `DailyPageResponse.keyPoints` | 필수 배열. `kind`는 `direction`/`driver`/`watch` |
| `DailyPageResponse.issues` | 필수 배열 |
| `DailyPageResponse.navigation` | 필수 |
| `ClusterDetailResponse.summary.sections` | 필수 배열. `analysis: string[]`는 **없어야 한다** |
| `ClusterDetailResponse.articleGrouping` | 필수 |
| `ClusterArticleResponse.processedArticleId` | **필수 `number`** (옵셔널·`null` 아님) |
| 기사별 그룹 3필드 | `similarGroupId` · `isSimilarGroupRepresentative` · `exactDuplicateCount` 필수 |

- **구버전 payload를 수용하려고 손으로 optional을 붙이지 않는다.** 호환 계약이 없으므로
  optional은 실제 계약을 가리는 거짓 정보가 된다(A-8).
- 타입은 좁게, 런타임 매퍼는 관대하게가 원칙이다(A-1-7). 매퍼의 방어 코드는 그대로 둔다.

### 백엔드가 값을 채울 때 확인할 것

작성 당시 B-2와 B-4는 **응답 형태는 최종본이지만 값이 고정값**이었다(A-0). 백엔드가 읽기 경로를
연결하면 **코드 변경 없이 값만 채워져야 한다**는 것이 설계 전제였다. 실서버 값이 붙은 뒤 확인할 것:

- 클러스터 상세가 `analysisStatus: READY`와 `sections[]`를 실제로 내려주는지 → 지금은 fixture로만
  검증된 경로(`e2e/cluster-analysis.spec.ts`)가 실서버에서도 같게 그려지는지
- `articleGrouping.status: READY`와 다건 그룹이 실제로 오는지 → `e2e/b4-article-grouping.spec.ts`와
  대조
- 실서버 값과 fixture의 형태가 어긋나면 **fixture가 아니라 실제 응답을 기준으로** 맞춘다

---

## 6. 검증 명령

작업 종류와 무관하게 아래를 마지막 편집 **이후에** 실행하고 결과를 근거로 남긴다.

```bash
pnpm test        # vitest
pnpm build       # tsc -b && vite build — 이 저장소의 유일한 타입체크
pnpm lint:fix && pnpm lint
pnpm run knip    # baseline 2건 외에 늘어나지 않았는지
pnpm exec playwright test
```

- `pnpm build`를 반드시 돌린다. Biome은 타입 인식 린팅을 하지 않으므로 **린터만으로는 타입
  문제를 잡지 못한다**(`AGENTS.md`).
- 사전 존재 실패(§1 참조)를 새 실패와 구분해 보고한다.
