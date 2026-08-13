# 백엔드 지원 요청 — Market Brief UI 개선 (2026-08-12)

- **배경**: `docs/superpowers/specs/2026-08-12-market-brief-ui-overhaul-design.md`의 UI 개선 중
  **프런트엔드만으로는 구현할 수 없는 항목**을 모은 문서다.
- **원칙**: 프런트엔드는 백엔드에 없는 값을 추측 생성하지 않는다. 아래 항목은 백엔드 개발이
  끝난 뒤 별도 작업으로 진행한다.
- **관련 문서**: 이미 추적 중인 계약은 `docs/backend-dependencies.md`에 있다. 이 문서는 이번
  UI 개선에서 **새로 발견된** 요청만 담는다.
- **현재 API 기준**: `docs/api-spec.json`

---

## 요약

| # | 항목 | 막힌 요구 | 우선순위 |
|---|---|---|---|
| B-1 | 페이지 핵심 요약 필드 | 요청서 §4.1 `오늘의 핵심` 3개 항목 | 높음 |
| B-2 | 클러스터 분석 구조화 + 근거 매핑 | 요청서 §4.4 전체 | 높음 |
| B-3 | 아카이브 검색 파라미터 | 요청서 §7 키워드·시장·테마 필터 | 중간 |
| B-4 | 기사 중복·유사 묶음 | 요청서 §4.5 중복 기사 묶음 표시 | 낮음 |
| B-5 | 인접 영업일 조회 | 요청서 §9.1 (프런트 우회 구현함) | 낮음 |

---

## B-1. 페이지 레벨 핵심 요약 필드

**막힌 요구** — 요청서 §4.1. 사용자가 첫 화면에서 다음 세 질문에 바로 답을 얻어야 한다.

1. 오늘 시장은 상승인가, 하락인가?
2. 가장 중요한 원인은 무엇인가?
3. 지금 주의해서 봐야 할 이슈는 무엇인가?

**현재 상태** — `DailyPageResponse`에는 `globalHeadline`(문자열 1개)만 있다. 시장별
`MarketAnalysisResponse`에 `background[]`, `keyThemes[]`, `outlook`이 있으나 **페이지 전역이
아니라 시장 단위**다. 미국과 한국의 방향이 엇갈릴 때 프런트가 한 문장으로 합치면 사실을
왜곡하게 된다.

**요청** — `DailyPageResponse`에 페이지 전역 핵심 항목을 추가.

```jsonc
{
  "keyPoints": [
    { "kind": "direction", "label": "시장 방향",   "text": "..." },
    { "kind": "driver",    "label": "주요 원인",   "text": "..." },
    { "kind": "watch",     "label": "관전 포인트", "text": "..." }
  ]
}
```

- `kind`는 열거형으로 고정해 주세요. 프런트가 아이콘·순서를 매핑합니다.
- 생성 실패 시 배열을 비우거나 필드를 생략해 주세요. 프런트는 빈 배열이면 블록을 숨깁니다.

**차단된 UI** — 최신 브리프 상단의 `오늘의 핵심` 블록. 이 필드가 생기기 전까지 렌더링하지 않는다.

---

## B-2. 클러스터 AI 분석 구조화 및 근거 매핑

**막힌 요구** — 요청서 §4.4 전체.

**현재 상태** — `ClusterSummaryResponse`는 다음이 전부다.

```jsonc
{ "short": "string | null", "long": "string | null", "analysis": ["string"] }
```

`analysis[]`는 제목 없는 문단 배열이라 어느 문단이 "발생 배경"이고 어느 문단이 "시장 영향"인지
구분할 근거가 없다. 프런트에서 휴리스틱으로 분류하면 잘못된 소제목을 붙이게 된다.

**요청 (a) — 구조화 섹션**

```jsonc
{
  "sections": [
    { "kind": "background",  "title": "발생 배경",        "paragraphs": ["..."] },
    { "kind": "impact",      "title": "시장 영향",        "paragraphs": ["..."] },
    { "kind": "related",     "title": "관련 업종·종목",   "paragraphs": ["..."] },
    { "kind": "outlook",     "title": "향후 관전 포인트", "paragraphs": ["..."] }
  ]
}
```

**요청 (b) — 문장 단위 근거 기사 매핑**

요청서는 "AI 분석의 사실이나 수치 옆에서 관련 근거 기사를 확인"할 수 있어야 한다고 요구한다.
문단이나 문장에 근거 기사 식별자를 붙여 주세요.

```jsonc
{ "paragraphs": [ { "text": "...", "sourceArticleIds": [1024, 1031] } ] }
```

**요청 (c) — 분석 생성 기준 시각과 근거 충돌 표시**

요청서는 근거 기사와 AI 분석의 수치·방향이 상충할 때 다음 중 하나를 요구한다.

- 기준일·시점 차이 설명
- 상충하는 근거가 존재한다는 경고
- AI 분석 생성 기준 시각
- 해당 문장을 뒷받침하는 기사 목록

이 중 **AI 분석 생성 기준 시각만** 기존 `lastUpdatedAt`으로 프런트에서 표시 가능하다(이번
작업에 포함). 나머지 셋은 백엔드 판정이 필요하다. 최소한 아래 하나를 제공해 주세요.

```jsonc
{ "analysisGeneratedAt": "2026-08-12T07:20:00+09:00",
  "conflictsWithSources": true }
```

**차단된 UI** — 이슈 상세의 소제목 구조, 문장 옆 근거 기사 표시, 근거 충돌 경고.
이번 작업에서는 `핵심 요약 / AI 심층 분석 / 근거 기사` 3단 계층과 글자 크기 통일까지만 한다.

---

## B-3. 아카이브 검색 파라미터

**막힌 요구** — 요청서 §7의 키워드 검색, US/KR 시장 필터, 핵심 테마 필터.

**현재 상태** — `GET /pages/archive`의 파라미터는 `fromDate`, `toDate`, `status`, `page`,
`size`뿐이다.

**우회가 불가능한 이유** — 목록이 서버 페이지네이션이므로, 전체 페이지를 받아 클라이언트에서
거르면 페이지네이션·총건수·정렬이 전부 어긋난다. 데이터가 적어도 잘못된 설계다.

**요청** — `GET /pages/archive`에 파라미터 추가.

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `q` | string | `pageTitle` · `headlineSummary` 대상 키워드 검색 |
| `marketType` | string | `US` / `KR` 등 시장 필터 |
| `theme` | string | 핵심 테마 필터. 값 목록을 함께 정의해 주세요 |

`theme`을 쓰려면 선택 가능한 테마 목록을 얻을 방법도 필요합니다
(예: `GET /pages/archive/themes` 또는 응답 `meta`에 포함).

**이번 작업에 포함되는 것** — 최근 1주·1개월 날짜 프리셋, 상태 필터, 날짜 범위 사용성 개선,
모바일 카드 전환. 모두 기존 파라미터만 쓴다.

---

## B-4. 기사 중복·유사 묶음

**막힌 요구** — 요청서 §4.5 "중복 또는 유사 기사 묶음 표시".

**현재 상태** — `ClusterArticleResponse`에는 유사도·중복 그룹 정보가 없다. 제목 문자열
비교로 판정하면 서로 다른 기사를 합치거나 같은 기사를 놓친다.

**요청** — 기사에 중복 그룹 식별자를 추가.

```jsonc
{ "duplicateGroupId": "dup-3", "isGroupRepresentative": true }
```

**이번 작업에 포함되는 것** — 20건 단위 추가 로딩, 최신순·관련도순 정렬, 언론사 필터,
제목 검색. 클러스터 상세는 기사 전체를 한 응답으로 받으므로 클라이언트 처리가 정당하다.

---

## B-5. 인접 영업일 조회 (기존 D-05)

**막힌 요구** — 요청서 §9.1. 이미 `docs/backend-dependencies.md`의 D-05로 추적 중이다.

**이번 작업의 우회 구현** — 인접 영업일 엔드포인트가 없으므로, 기준일 ±90일 범위를
`GET /pages/archive`로 한 번 조회해 실제 존재하는 직전·직후 `businessDate`를 계산한다.
존재할 때만 버튼을 활성화하고 라벨에 실제 날짜를 표시한다.

**남는 문제** — 90일 안에 인접 스냅샷이 없으면 버튼이 잘못 비활성화된다. 또 페이지 이동마다
목록 조회가 한 번 더 발생한다.

**요청** — D-05 그대로. 전용 응답 필드가 가장 간단하다.

```jsonc
{ "adjacentDates": { "previous": "2026-08-11", "next": null } }
```

이 필드가 생기면 프런트의 ±90일 우회 조회를 제거한다.

---

## 진행 순서 제안

1. **B-1**, **B-2 (a)** — 사용자가 첫 화면과 이슈 상세에서 결론을 파악하는 데 직접 기여한다.
2. **B-2 (b)(c)** — 근거 신뢰성. (a) 이후에 붙이는 편이 스키마가 안정적이다.
3. **B-3** — 아카이브가 "검색"이라는 이름값을 하려면 필요하다.
4. **B-5** — 프런트 우회가 동작 중이라 급하지 않다.
5. **B-4** — 없어도 목록 사용성은 확보된다.

각 항목이 준비되면 `docs/api-spec.json`을 갱신해 주세요. 프런트는 스펙 갱신을 기준으로
후속 작업을 시작합니다.

---
---

# 부록 A. FE 개발 참고 — 확정 계약 전문 (2026-08-13)

위 요청 B-1~B-5에 대해 백엔드가 응답 계약을 확정했다. **이 부록만 읽고 FE 작업을 시작할 수
있도록** 다른 문서를 보지 않아도 되게 계약 내용을 그대로 옮겨 적었다.

세 가지를 구분해서 읽어야 한다.

- **계약** — 확정된 응답 형태. 이 형태를 기준으로 타입·매퍼·컴포넌트를 만든다.
- **보장** — 백엔드가 지키기로 한 불변식. FE가 방어 코드를 짜지 않아도 되는 범위다.
- **현재 서버 동작** — 지금 API를 호출하면 실제로 오는 값. 계약대로 값이 채워지지 않은
  항목이 있으므로, 어디까지 실서버로 확인하고 어디부터 mock으로 개발할지 판단하는 근거다.

구현이 진행되면서 세부가 바뀔 수 있다. 최종 판정은 백엔드가 생성하는 OpenAPI 스펙이다.

---

## A-0. 구현 현황

| 항목 | 응답 형태 | 실제 값 | FE가 지금 할 수 있는 것 |
|---|---|---|---|
| B-1 오늘의 핵심 | 확정, 배포됨 | 배치가 생성·저장 중 | **실데이터로 완결 가능** |
| B-5 인접 영업일 | 확정, 배포됨 | 동작 중 | **실데이터로 완결 가능** |
| B-2 구조화 분석 | 확정, 배포됨 | 생성·저장은 되지만 **읽기 경로가 아직 고정값** | 전부 선구현 (READY 경로는 mock) |
| B-4 유사 기사 그룹 | 확정, 배포됨 | **전부 placeholder 고정값** | 전부 선구현 (READY 경로는 mock) |
| B-3 테마·아카이브 검색 | 미구현 | 없음 | UI·상태관리까지만, 실호출 불가 |

**B-2의 "읽기 경로가 아직 고정값"이란** — 배치는 구조화 분석을 생성해서 DB에 저장하고
있지만, 클러스터 상세 API가 그 저장값을 아직 읽지 않는다. 그래서 어떤 클러스터를 조회해도
`analysisStatus: "UNAVAILABLE"`, `sections: []`이 온다. 응답 형태 자체는 최종본이므로 타입을
붙여도 오류가 나지 않는다.

**B-4의 "전부 placeholder 고정값"이란** — 세 필드(`similarGroupId`,
`isSimilarGroupRepresentative`, `exactDuplicateCount`)와 `articleGrouping` 객체가 이미 필수
필드로 응답에 들어 있으나, 값은 계산 결과가 아니라 고정값이다. 모든 기사가 자기 혼자
들어 있는 단독 그룹을 받고, 전원이 대표이며, 중복 수는 0이고, `articleGrouping.status`는
항상 `UNAVAILABLE`이다. 즉 **UNAVAILABLE 경로는 지금 실서버로 검증할 수 있고**, READY
경로만 mock이 필요하다.

---

## A-1. 모든 응답에 공통으로 적용되는 규칙

### A-1-1. 엔드포인트 목록

모든 경로 앞에 `/stock/api`가 붙는다.

| 메서드 · 경로 | 용도 | 상태 |
|---|---|---|
| `GET /stock/api/pages/daily/latest` | 최신 일간 페이지 | 사용 가능 |
| `GET /stock/api/pages/daily?businessDate=&versionNo=` | 날짜(선택적으로 버전) 지정 조회 | 사용 가능 |
| `GET /stock/api/pages/navigation?businessDate=` | **인접 영업일 (B-5, 신규)** | 사용 가능 |
| `GET /stock/api/pages/{pageId}` | 페이지 ID 직접 조회 | 사용 가능 |
| `GET /stock/api/pages/archive?...` | 아카이브 목록·검색 | 기존 파라미터만 사용 가능 |
| `GET /stock/api/pages/archive/themes` | **테마 카탈로그 (B-3, 신규)** | 미구현 |
| `GET /stock/api/news/clusters/{clusterId}` | 클러스터(이슈) 상세 | 사용 가능 |

`clusterId`는 UUID다. 형식이 UUID가 아니면 422다.

### A-1-2. 인증

모든 읽기 엔드포인트가 Bearer 토큰을 요구한다. 신규 엔드포인트도 기존 페이지 조회와
동일한 인증 정책을 따르므로, FE의 인증 처리에 예외 분기를 만들 필요가 없다.

| 상태 | 오류 코드 |
|---|---|
| 401 | `AUTH_MISSING_BEARER_TOKEN`, `AUTH_TOKEN_EXPIRED`, `AUTH_INVALID_TOKEN` |
| 403 | `AUTH_FORBIDDEN` |

### A-1-3. 응답 봉투

성공:

```jsonc
{
  "success": true,
  "data": { /* 아래 각 절의 계약 */ },
  "meta": { "requestId": "…", "timestamp": "2026-08-13T07:20:31Z" }
}
```

실패:

```jsonc
{
  "success": false,
  "error": { "code": "PAGE_NOT_FOUND", "message": "…" },
  "meta": { "requestId": "…", "timestamp": "2026-08-13T07:20:31Z" }
}
```

- `error.details`는 값이 있을 때만 존재한다. **값이 없으면 `null`이 아니라 키 자체가
  빠진다.** `'details' in error`로 판정해야 하고 `error.details === null` 비교는 항상 거짓이다.
- `meta.requestId`는 오류 리포팅에 쓸 수 있다. 사용자에게 노출할 필요는 없지만 로그에는
  남겨 두는 편이 백엔드 추적에 도움이 된다.

### A-1-4. 오류 코드

| 상태 | 코드 | 발생 조건 |
|---|---|---|
| 404 | `LATEST_PAGE_NOT_FOUND` | 생성된 페이지가 한 건도 없음 (`/daily/latest`) |
| 404 | `PAGE_NOT_FOUND` | 해당 날짜/ID의 페이지 없음 |
| 404 | `PAGE_VERSION_NOT_FOUND` | `versionNo`로 지정한 버전 없음 |
| 404 | `CLUSTER_NOT_FOUND` | 클러스터 없음 |
| 404 | `CLUSTER_REPRESENTATIVE_ARTICLE_NOT_FOUND` | 클러스터는 있으나 대표 기사 데이터 결손 |
| 422 | `REQUEST_VALIDATION_ERROR` | 날짜 형식 오류, 범위 밖 값, 잘못된 enum 등 |
| 422 | `INVALID_THEME` | **(B-3 예정)** 알 수 없거나 비활성인 테마 코드 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류 |

**콘텐츠 생성 실패는 HTTP 오류가 아니다.** AI 분석 실패, 유사 그룹 생성 실패, 핵심 포인트
생성 실패는 전부 **200 응답 안의 상태 필드**로 온다. FE는 이것들을 네트워크 오류 UI로
처리하면 안 된다.

공개 메시지에는 provider endpoint, 모델 경로, SQL, 스택 트레이스가 절대 포함되지 않는다.
서버가 내려주는 `message`는 그대로 사용자에게 보여줘도 안전하다.

### A-1-5. 날짜와 시각 형식

| 종류 | 형식 | 예 | 비고 |
|---|---|---|---|
| 영업일 | `YYYY-MM-DD` | `2026-08-13` | KST 기준 영업일. 타임존 변환 대상이 아니다 |
| 시각 | ISO 8601 **UTC + `Z`**, 초 단위 | `2026-08-12T22:20:00Z` | 마이크로초는 항상 잘려 나간다 |

**주의** — 계약 논의 과정의 예시에는 `2026-08-13T07:20:00+09:00`처럼 KST 오프셋으로 적힌
것이 있으나, **실제 직렬화는 UTC `Z`**다. FE는 UTC로 받아 표시 시점에 KST로 변환한다.
`businessDate`(날짜)와 `generatedAt`류(시각)를 같은 파서로 다루지 말 것 — 전자는
타임존이 없는 영업일 라벨이다.

### A-1-6. 필드 존재 규칙

- **필수로 명시된 키는 값이 `null`이거나 빈 배열이어도 항상 존재한다.** 키 존재 여부
  (`'keyPoints' in data`)로 분기하지 말고 값으로 분기한다.
- 배열 필드가 `null`로 오는 경우는 없다. 없으면 `[]`다.
- `null`은 "계산하지 않음"이 아니라 **"그런 값이 존재하지 않음"**을 뜻한다. 예를 들어
  `previousBusinessDate: null`은 "이전 영업일이 없다"이지 "조회 실패"가 아니다.

### A-1-7. enum 전체 목록

백엔드에서 닫혀 있다. 목록에 없는 값은 서버가 내려보내지 않는다.

| 위치 | 값 |
|---|---|
| 페이지 `status` | `READY`, `PARTIAL` (공개 조회) / `FAILED` (명시적 ID·버전 조회에서만) |
| `marketType` | `US`, `KR` |
| keyPoint `kind` | `direction`, `driver`, `watch` |
| keyPoint `direction` | `UP`, `DOWN`, `MIXED`, `FLAT` |
| `analysisStatus` | `READY`, `PARTIAL`, `UNAVAILABLE` |
| 분석 섹션 `kind` | `background`, `impact`, `related`, `outlook` |
| `conflictStatus` | `NOT_CHECKED`, `NONE`, `FOUND` |
| `analysisIssues[].code` | `ANALYSIS_GENERATION_FAILED`, `NO_GROUNDED_SENTENCES`, `INVALID_SOURCE_REFERENCE`, `CONFLICT_CHECK_FAILED` |
| `articleGrouping.status` | `READY`, `UNAVAILABLE` |
| `articleGrouping.issue.code` | `SIMILARITY_GROUPING_FAILED` |

**DTO 타입은 위 문자열 union으로 좁게 선언한다.** `string`으로 넓히면 서버가 계약을 깨도
컴파일 단계에서 잡히지 않는다. 다만 **화면 매퍼는 알 수 없는 값이 들어와도 죽지 않게**
방어한다(알 수 없는 값 → 해당 항목을 표시에서 제외하거나 중립 표현). 타입은 좁게, 런타임은
관대하게가 원칙이다.

### A-1-8. 읽기 API는 AI를 호출하지 않는다

모든 생성형·분류 결과는 배치가 만들어 저장한 스냅샷이다. 읽기 API는 저장된 것을 조립할
뿐이다. 여기서 나오는 FE 관점의 결론:

- **같은 페이지를 두 번 읽어도 값이 달라지지 않는다.** 재요청으로 "다시 생성"을 기대하는
  재시도 버튼을 만들면 안 된다.
- 응답 지연이 AI 호출 때문일 수 없으므로, 긴 로딩 스피너나 "AI가 분석 중입니다" 문구는
  현실을 반영하지 않는다.
- 과거 날짜 페이지는 불변이다. 캐시를 길게 잡아도 안전하다.

### A-1-9. 공개 페이지 선택 기준

공개 조회(`/daily/latest`, `/daily?businessDate=`, `/archive`, `/navigation`)는
**같은 날짜의 여러 버전 중 `READY` 또는 `PARTIAL`인 최신 버전**을 고른다. `FAILED` 버전은
공개 탐색에서 완전히 제외되고, `pageId` 직접 조회나 `versionNo` 명시 조회에서만 보인다.

- 최신 절대 버전이 `FAILED`이면, 그 이전의 표시 가능한 버전이 선택된다.
- 어떤 날짜의 모든 버전이 `FAILED`이면, 그 날짜는 공개 탐색에서 **존재하지 않는 날짜**다.
  인접 영업일 계산에서도 건너뛴다.

---

## A-2. B-1 오늘의 핵심 (`keyPoints`) — 실데이터 사용 가능

### 계약

`DailyPageResponse`에 `keyPoints`가 **필수 배열**로 추가되었다.

```jsonc
{
  "pageId": 412,
  "businessDate": "2026-08-13",
  "globalHeadline": "…",
  "status": "READY",
  "issues": [],
  "keyPoints": [
    { "kind": "direction", "label": "시장 방향",
      "text": "미국 증시는 상승했지만 한국 증시는 하락해 시장별 흐름이 엇갈렸습니다.",
      "direction": "MIXED" },
    { "kind": "driver", "label": "주요 원인",
      "text": "금리 인하 기대와 국내 반도체주 약세가 주요 변동 요인이었습니다." },
    { "kind": "watch", "label": "관전 포인트",
      "text": "미국 물가 지표와 외국인의 반도체주 수급을 확인할 필요가 있습니다." }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `kind` | `'direction' \| 'driver' \| 'watch'` | 항목 종류. 판별자(discriminator) |
| `label` | 고정 문자열 | `시장 방향` / `주요 원인` / `관전 포인트` |
| `text` | `string` | 완결된 한 문장 |
| `direction` | `'UP' \| 'DOWN' \| 'MIXED' \| 'FLAT'` | **`kind: 'direction'`에만 존재** |

### 보장

- **성공하면 정확히 3개**, 순서는 항상 `direction` → `driver` → `watch`.
- **실패하면 `[]`.** 1개나 2개만 오는 부분 성공은 존재하지 않는다. 하나라도 검증에
  실패하면 배열 전체가 비워진다. → FE는 `length === 3`이 아니면 블록 전체를 숨기면 되고,
  항목별 존재 여부를 개별 확인할 필요가 없다.
- `keyPoints` 키 자체는 절대 생략되지 않고 `null`도 되지 않는다.
- `label`은 서버가 고정한다. FE에서 라벨 문자열을 만들거나 번역하지 않는다.
- `text`에는 **HTML, Markdown, 줄바꿈이 없다.** 그대로 텍스트 노드로 렌더하면 된다.
  `dangerouslySetInnerHTML`이나 마크다운 파서가 필요 없다.
- `direction` 필드를 `driver`/`watch`에 넣으면 서버 쪽 검증이 거부한다. 따라서 그 조합이
  응답에 나타날 수 없다. DTO도 discriminated union으로 선언해 같은 제약을 컴파일 타임에
  갖게 한다.
- 다른 영역이 실패해 페이지가 `PARTIAL`이어도, 핵심 포인트 생성이 성공했다면 3개가 온다.
- `globalHeadline`과 `keyPoints`의 성공 여부는 **완전히 독립**이다. 헤드라인이 없어도
  핵심 포인트가 있을 수 있고, 그 반대도 가능하다.

### 실패 표현

핵심 포인트 생성이 실패하면 `keyPoints: []`이고, 페이지 상태가 `PARTIAL`이 되며,
`issues[]`에 다음 항목이 추가된다.

```jsonc
{ "category": "AI_SUMMARY",
  "code": "KEY_POINTS_GENERATION_FAILED",
  "message": "오늘의 핵심 포인트를 준비하지 못했습니다." }
```

이 이슈는 일반적인 AI 요약 실패(`AI_SUMMARY_FALLBACK`)로 뭉뚱그려지지 않고 **별도 코드로
구분되어** 온다. 따라서 FE는 "핵심 포인트만 실패"와 "요약 전반 실패"를 구별해 안내할 수 있다.

### 렌더링 규칙

- **텍스트가 의미를 전부 전달해야 한다.** 방향(`UP`/`DOWN` 등)을 색이나 화살표 아이콘으로만
  표현하면 색을 구분하지 못하는 사용자에게 정보가 전달되지 않는다. 색·아이콘은 보조 수단이고,
  라벨과 문장은 항상 보이게 한다.
- `keyPoints`가 비면 **섹션 전체(제목 포함)를 렌더하지 않는다.** 제목만 남고 내용이 빈
  landmark가 생기면 스크린리더에서 의미 없는 헤딩이 읽힌다.
- **`globalHeadline`이나 시장별 요약에서 핵심 포인트를 합성하지 않는다.** 미국과 한국의
  방향이 엇갈릴 때 FE가 한 문장으로 합치면 사실 왜곡이 된다는 것이 이 필드를 요청한
  이유였다. 빈 배열이면 그냥 숨긴다.

### 준비할 테스트 케이스

성공 3개 정상 순서 / `direction` 네 값 각각 / `[]` (섹션 미표시) / 헤드라인 실패 + 핵심
포인트 성공 / 헤드라인 성공 + 핵심 포인트 실패(`PARTIAL` + 이슈 표시) / 접근성(라벨 노출,
빈 헤딩 없음).

---

## A-3. B-2 구조화 클러스터 분석 — 계약 확정, 읽기 경로 대기

### 파괴적 변경

**`summary.analysis: string[]`은 제거되었다.** 제목 없는 문단 배열을 렌더하던 코드와, 문단
텍스트에서 소제목을 추론하던 휴리스틱은 전부 삭제 대상이다.

### 계약

```jsonc
{
  "clusterId": "…",
  "title": "…",
  "tags": ["반도체", "외국인"],
  "summary": {
    "short": "반도체주 약세가 국내 증시 하락을 주도했습니다.",
    "long": "외국인 매도와 업황 우려가 함께 반영됐습니다.",
    "analysisStatus": "READY",
    "analysisGeneratedAt": "2026-08-12T22:20:00Z",
    "analysisIssues": [],
    "conflictStatus": "NONE",
    "sections": [
      {
        "kind": "background",
        "title": "발생 배경",
        "paragraphs": [
          {
            "sentences": [
              {
                "text": "미국 반도체주 약세가 국내 시장으로 이어졌습니다.",
                "sourceArticleIds": [1024],
                "conflictStatus": "NONE",
                "conflictingSourceArticleIds": [],
                "conflictNote": null
              }
            ]
          }
        ]
      }
    ]
  }
}
```

계층은 `summary` → `sections[]` → `paragraphs[]` → `sentences[]` 4단이다. 문장이 최소
단위이며 근거 기사와 충돌 정보는 **문장에 붙는다**.

| 필드 | 타입 | 설명 |
|---|---|---|
| `summary.short` / `long` | `string \| null` | 기존 그대로. 클러스터 레코드에서 오며 분석 실패와 무관하게 유지된다 |
| `analysisStatus` | `'READY' \| 'PARTIAL' \| 'UNAVAILABLE'` | 분석 전체 상태 |
| `analysisGeneratedAt` | `string \| null` | 분석 생성 시각. `UNAVAILABLE`이면 항상 `null` |
| `analysisIssues` | `{ code, message }[]` | 검증 중 발생한 문제. 없으면 `[]` |
| `conflictStatus` | `'NOT_CHECKED' \| 'NONE' \| 'FOUND'` | 문장 단위 값들의 집계 |
| `sections` | `Section[]` | 없으면 `[]`. `null` 아님 |
| `section.kind` | 4종 고정 | 아래 순서 표 참조 |
| `section.title` | 고정 문자열 | 서버가 정한 제목 |
| `paragraph.sentences` | `Sentence[]` | 빈 배열로 오지 않음 |
| `sentence.text` | `string` | 한 문장 |
| `sentence.sourceArticleIds` | `number[]` | 이 문장을 뒷받침하는 기사 |
| `sentence.conflictStatus` | 3종 | 문장 단위 충돌 상태 |
| `sentence.conflictingSourceArticleIds` | `number[]` | 상충 보도 기사 |
| `sentence.conflictNote` | `string \| null` | 충돌 설명 |

### 섹션 순서와 제목 (서버 고정)

| 순서 | `kind` | `title` |
|---|---|---|
| 1 | `background` | 발생 배경 |
| 2 | `impact` | 시장 영향 |
| 3 | `related` | 관련 업종·종목 |
| 4 | `outlook` | 향후 관전 포인트 |

- **FE는 제목을 만들지 않는다.** 서버가 준 `title`을 그대로 쓴다.
- **본문 텍스트에서 섹션 종류를 추론하지 않는다.** `kind`가 정답이다.
- 순서는 항상 위 표대로다. 같은 `kind`가 두 번 오지 않는다.
- **내용이 없는 섹션은 응답에 아예 포함되지 않는다.** 4개 중 2개만 올 수 있고, 그때도
  상대 순서는 유지된다. → FE는 "온 것을 순서대로 렌더"만 하면 되고, 4개 자리를 미리
  만들어 두고 빈 칸을 처리할 필요가 없다.

### 보장

- `sections`, `paragraphs`, `sentences` 어느 것도 **빈 배열인 채로 오지 않는다.** 비면
  상위 컨테이너가 통째로 제거된다. (`sections`만 예외적으로 전체가 비어 `[]`가 될 수 있고,
  그때는 반드시 `analysisStatus`가 `UNAVAILABLE`이다.)
- 모든 문장의 `sourceArticleIds`는 **1개 이상이고 중복이 없다.** 근거 없는 문장은 응답에
  도달하기 전에 제거된다.
- `sourceArticleIds`와 `conflictingSourceArticleIds`의 값은 **같은 응답의
  `articles[].processedArticleId` 안에서만** 나온다. 응답에 없는 기사 ID가 참조될 수 없다.
  → 근거 링크의 매칭 실패는 정상 케이스가 아니므로 그에 대한 UI를 만들 필요가 없다
  (방어 코드는 두되 사용자에게 보이는 오류 상태는 만들지 않는다).
- 지지 기사 ID와 충돌 기사 ID는 **서로 겹치지 않는다.**
- `analysisGeneratedAt`은 분석을 실제로 생성한 시각이다. **클러스터의 `lastUpdatedAt`과
  다르며, `lastUpdatedAt`을 분석 시각으로 표시하면 안 된다.** 기존에 `lastUpdatedAt`으로
  우회 표시하던 부분은 교체 대상이다.

### 상태별 처리

| `analysisStatus` | 의미 | 동반되는 값 | FE 처리 |
|---|---|---|---|
| `READY` | 생성·근거·충돌 검증을 모두 통과 | `sections` 있음, `analysisIssues: []` | 정상 렌더 |
| `PARTIAL` | 표시할 내용은 있으나 일부가 깎임 | `sections` 있음, `analysisIssues` 1개 이상 | 정상 렌더 + 비차단 안내 |
| `UNAVAILABLE` | 표시할 유효 문장이 없음 | `sections: []`, `analysisGeneratedAt: null`, `conflictStatus: 'NOT_CHECKED'` | **단일 unavailable 상태 하나만** 표시 |

`UNAVAILABLE`일 때 `sections`가 `[]`이고 `analysisGeneratedAt`이 `null`이며 집계
`conflictStatus`가 `NOT_CHECKED`인 것은 서버가 강제하는 불변식이다. 이 조합이 아닌
`UNAVAILABLE`은 존재할 수 없다.

**`UNAVAILABLE` 렌더 주의** — 섹션 제목 4개를 미리 그려 두고 내용만 비우면 안 된다. 빈
헤딩만 남는다. 분석 영역 전체를 하나의 안내 상태로 대체한다. 이때도 `summary.short`와
`summary.long`은 유효할 수 있으므로 **핵심 요약까지 같이 숨기지 않는다.**

### 이슈 코드

`analysisIssues[]`의 `message`는 서버 고정 문구이므로 **그대로 노출해도 안전**하다. 자체
문구를 쓰려면 `code`로 매핑한다.

| code | message | 언제 |
|---|---|---|
| `ANALYSIS_GENERATION_FAILED` | 분석을 생성하지 못했습니다. | 생성 자체 실패, 또는 응답 구조가 해석 불가 |
| `NO_GROUNDED_SENTENCES` | 근거를 확인할 수 있는 분석 문장이 없습니다. | 표시할 유효 문장이 하나도 남지 않음 |
| `INVALID_SOURCE_REFERENCE` | 일부 분석 문장의 근거 기사를 확인하지 못했습니다. | 근거 오류로 일부 문장이 제거됨 |
| `CONFLICT_CHECK_FAILED` | 일부 분석 문장의 충돌 근거를 확인하지 못했습니다. | 충돌 정보가 잘못돼 `NOT_CHECKED`로 낮춤 |

- **같은 코드가 두 번 오지 않는다.** 문장 10개가 같은 이유로 제거돼도 코드는 1개다.
- 순서는 최초 발견 순이다.
- **여러 개가 동시에 올 수 있다.** 대표적인 조합은 근거 오류로 모든 문장이 제거된 경우로,
  `INVALID_SOURCE_REFERENCE`(원인)와 `NO_GROUNDED_SENTENCES`(결과)가 함께 온다.

상태와 이슈의 조합을 정리하면 다음과 같다.

| 상황 | 상태 | 이슈 |
|---|---|---|
| 정상 | `READY` | `[]` |
| 일부 문장이 근거 오류로 제거, 남은 문장 있음 | `PARTIAL` | `INVALID_SOURCE_REFERENCE` |
| 충돌 정보가 잘못돼 정규화됨 | `PARTIAL` | `CONFLICT_CHECK_FAILED` |
| 모든 문장이 근거 오류로 제거됨 | `UNAVAILABLE` | `INVALID_SOURCE_REFERENCE` + `NO_GROUNDED_SENTENCES` |
| 생성 결과가 비어 있음 | `UNAVAILABLE` | `NO_GROUNDED_SENTENCES` |
| 생성 실패 / 구조 해석 불가 | `UNAVAILABLE` | `ANALYSIS_GENERATION_FAILED` |

### 충돌 표시 (`conflictStatus`)

문장 단위와 `summary` 단위 두 곳에 있다. `summary.conflictStatus`는 문장 값들의 집계이며
우선순위는 **`FOUND` > `NOT_CHECKED` > `NONE`**이다. 즉 문장 하나라도 `FOUND`면 전체가
`FOUND`다.

| 문장의 `conflictStatus` | `conflictingSourceArticleIds` | `conflictNote` | 의미 |
|---|---|---|---|
| `FOUND` | 1개 이상, 중복 없음 | 반드시 존재 | 근거 기사끼리 내용이 상충함 |
| `NONE` | **정확히 `[]`** | `null` | 검사했고 충돌이 없음 |
| `NOT_CHECKED` | **정확히 `[]`** | `null` | 검사하지 못함 |

```jsonc
{
  "text": "외국인은 반도체주를 순매도했습니다.",
  "sourceArticleIds": [1024],
  "conflictStatus": "FOUND",
  "conflictingSourceArticleIds": [1042],
  "conflictNote": "기사별 외국인 순매매 방향이 다르게 보도됐습니다."
}
```

문구를 정할 때 지켜야 할 것:

- **`FOUND`는 오류가 아니라 정상적인 분석 결과다.** 충돌을 발견했다는 것 자체는 품질 저하가
  아니며, 다른 문제가 없으면 `analysisStatus`는 `READY`다. 경고 아이콘이나 오류 색으로
  처리하면 잘못된 인상을 준다. "상충하는 보도가 있음"을 **정보로** 제시한다.
- **`NOT_CHECKED`를 "충돌 없음"으로 표시하면 안 된다.** 검사해서 없는 것(`NONE`)과 검사하지
  못한 것(`NOT_CHECKED`)은 다르다. `NOT_CHECKED`에는 절제된 문구를 쓰고, 충돌이 없다고
  단정하지 않는다.
- `conflictNote`는 차이를 설명할 뿐 **어느 기사가 옳은지 단정하지 않는다.** UI 문구도 같은
  톤을 유지한다.
- `FOUND`일 때 지지 기사와 충돌 기사는 **시각적으로 구분**해서 보여준다. 둘 다 같은
  클러스터의 기사이므로 링크 대상은 동일하게 처리할 수 있다.

### 근거 기사 참조 UX

- `ClusterArticleResponse.processedArticleId`가 **필수 정수**가 되었다(옵셔널·`null` 제거).
  기사 행의 DOM 타겟 id를 이 값에서 파생시킨다.
- 근거 참조 클릭은 **외부 원문 사이트로 이동이 아니라, 같은 화면의 해당 기사 행으로
  스크롤·포커스 이동**이다. 원문으로 나가는 것은 기사 행 자체의 링크가 담당한다.
- 키보드로도 이동할 수 있어야 하므로 참조는 `button` 또는 앵커로 만들고, 이동 후 대상 행이
  포커스를 받게 한다.

### 현재 서버 동작

클러스터 상세 API가 저장된 분석을 아직 읽지 않는다. **어떤 클러스터를 조회해도** 다음이
온다.

```jsonc
{ "analysisStatus": "UNAVAILABLE",
  "analysisGeneratedAt": null,
  "analysisIssues": [{ "code": "NO_GROUNDED_SENTENCES",
                       "message": "근거를 확인할 수 있는 분석 문장이 없습니다." }],
  "conflictStatus": "NOT_CHECKED",
  "sections": [] }
```

응답 형태는 최종본이므로 타입을 붙여도 오류가 없다. **`UNAVAILABLE` 경로는 실서버로
검증하고, `READY`/`PARTIAL`/`FOUND` 경로는 fixture로 개발**한다. 백엔드가 읽기 경로를
연결하면 코드 변경 없이 값만 채워진다.

### 준비할 테스트 케이스

`READY` 정상 / `READY` + `FOUND` 문장 포함 / `PARTIAL` + `INVALID_SOURCE_REFERENCE` /
`PARTIAL` + `CONFLICT_CHECK_FAILED` / `UNAVAILABLE` 3종(생성 실패, 빈 결과, 전 문장 제거) /
섹션 2개만 오는 경우 / 근거 참조 클릭 시 해당 기사 행 포커스 / `analysisGeneratedAt` 표시가
`lastUpdatedAt`이 아님.

---

## A-4. B-3 계층형 테마와 아카이브 검색 — 미구현

현재 `GET /stock/api/pages/archive`가 받는 파라미터는 여전히 `fromDate`, `toDate`, `status`,
`page`, `size`뿐이다. 아래는 **확정된 목표 계약**이며 아직 호출할 수 없다. UI·URL 상태·쿼리
키까지는 선구현할 수 있고, 실호출 검증만 백엔드 완료 후로 미룬다.

### A-4-1. 테마 카탈로그 API

```http
GET /stock/api/pages/archive/themes
```

```jsonc
{
  "items": [
    {
      "code": "SECTOR",
      "label": "업종",
      "description": "기업의 주요 사업 영역",
      "children": [
        {
          "code": "SECTOR_SEMICONDUCTORS",
          "label": "반도체",
          "description": "반도체 산업",
          "children": [
            { "code": "SECTOR_SEMICONDUCTORS_MEMORY_HBM",
              "label": "메모리·HBM", "description": "…", "children": [] }
          ]
        }
      ]
    }
  ]
}
```

- **재귀 구조**이며 `children`은 **리프 노드에서도 항상 배열로 존재**한다. 없으면 `[]`다.
- 활성 노드만 온다. 비활성 부모 아래의 노드는 자식까지 통째로 빠진다.
- **정렬은 서버가 계층별로 끝내서 준다.** FE에서 재정렬하지 않는다.
- **반환된 모든 노드는 검색 조건으로 선택 가능하다.** 최상위·중간·리프 구분 없이 전부
  체크박스 대상이 된다.
- `label`과 `description`은 이 API에서만 얻는다. FE에 코드→한글 매핑을 하드코딩하지 않는다.

### A-4-2. 테마 체계

초기 규모는 최상위 5개, 중간 18개, 리프 40개이며 깊이는 3단계다. 다만 **API와 DB는 임의
깊이를 지원**하므로 **트리 컴포넌트를 3단계로 하드코딩하지 말고 재귀로 구현한다.**

코드 목록은 다음과 같다(한글 라벨은 API가 준다). 목록 자체는 fixture 작성용 참고다.

```text
MACRO
├─ MACRO_ECONOMIC_DATA
│  ├─ MACRO_ECONOMIC_DATA_INFLATION
│  └─ MACRO_ECONOMIC_DATA_EMPLOYMENT_GROWTH
├─ MACRO_MONETARY_MARKETS
│  ├─ MACRO_MONETARY_MARKETS_INTEREST_RATES_BONDS
│  ├─ MACRO_MONETARY_MARKETS_LIQUIDITY
│  └─ MACRO_MONETARY_MARKETS_FX
└─ MACRO_POLICY_RISK
   ├─ MACRO_POLICY_RISK_FISCAL_REGULATION
   └─ MACRO_POLICY_RISK_GEOPOLITICS_TRADE

SECTOR
├─ SECTOR_SEMICONDUCTORS
│  ├─ SECTOR_SEMICONDUCTORS_MEMORY_HBM
│  ├─ SECTOR_SEMICONDUCTORS_FOUNDRY_SYSTEM
│  └─ SECTOR_SEMICONDUCTORS_EQUIPMENT_MATERIALS
├─ SECTOR_AI_SOFTWARE
│  ├─ SECTOR_AI_SOFTWARE_AI_INFRASTRUCTURE
│  └─ SECTOR_AI_SOFTWARE_CLOUD_PLATFORM
├─ SECTOR_FINANCIALS
│  ├─ SECTOR_FINANCIALS_BANKING
│  └─ SECTOR_FINANCIALS_SECURITIES_INSURANCE
├─ SECTOR_AUTOS_MOBILITY
│  ├─ SECTOR_AUTOS_MOBILITY_AUTOMAKERS_COMPONENTS
│  └─ SECTOR_AUTOS_MOBILITY_EV_BATTERY
├─ SECTOR_BIO_HEALTHCARE
│  ├─ SECTOR_BIO_HEALTHCARE_PHARMA_BIOTECH
│  └─ SECTOR_BIO_HEALTHCARE_MEDICAL_SERVICES
├─ SECTOR_CONSUMER_CONTENT
│  ├─ SECTOR_CONSUMER_CONTENT_RETAIL_ECOMMERCE
│  └─ SECTOR_CONSUMER_CONTENT_BRANDS_MEDIA_GAMING
├─ SECTOR_INDUSTRIALS_INFRA
│  ├─ SECTOR_INDUSTRIALS_INFRA_SHIPBUILDING_DEFENSE
│  ├─ SECTOR_INDUSTRIALS_INFRA_CONSTRUCTION_POWER
│  └─ SECTOR_INDUSTRIALS_INFRA_TRANSPORT_LOGISTICS
└─ SECTOR_ENERGY_MATERIALS
   ├─ SECTOR_ENERGY_MATERIALS_OIL_GAS
   └─ SECTOR_ENERGY_MATERIALS_STEEL_CHEMICALS

CORPORATE_EVENT
├─ CORPORATE_EVENT_PERFORMANCE
│  ├─ CORPORATE_EVENT_PERFORMANCE_EARNINGS_GUIDANCE
│  └─ CORPORATE_EVENT_PERFORMANCE_ORDERS_CONTRACTS
├─ CORPORATE_EVENT_CAPITAL_ACTION
│  ├─ CORPORATE_EVENT_CAPITAL_ACTION_MNA
│  ├─ CORPORATE_EVENT_CAPITAL_ACTION_IPO_CAPITAL_RAISE
│  └─ CORPORATE_EVENT_CAPITAL_ACTION_DIVIDEND_BUYBACK
└─ CORPORATE_EVENT_GOVERNANCE
   └─ CORPORATE_EVENT_GOVERNANCE_MANAGEMENT

MARKET_FLOW
├─ MARKET_FLOW_INVESTOR
│  ├─ MARKET_FLOW_INVESTOR_FOREIGN
│  ├─ MARKET_FLOW_INVESTOR_INSTITUTIONAL
│  └─ MARKET_FLOW_INVESTOR_RETAIL
└─ MARKET_FLOW_POSITIONING
   ├─ MARKET_FLOW_POSITIONING_SHORT_SELLING
   ├─ MARKET_FLOW_POSITIONING_ETF_REBALANCING
   └─ MARKET_FLOW_POSITIONING_VOLATILITY_SENTIMENT

ALTERNATIVE_ASSET
├─ ALTERNATIVE_ASSET_COMMODITIES
│  ├─ ALTERNATIVE_ASSET_COMMODITIES_ENERGY_PRICES
│  └─ ALTERNATIVE_ASSET_COMMODITIES_METALS_AGRICULTURE
└─ ALTERNATIVE_ASSET_DIGITAL
   └─ ALTERNATIVE_ASSET_DIGITAL_CRYPTO
```

**`GENERAL`, `OTHER`, `UNCLASSIFIED` 같은 코드는 만들지 않는다.** 미분류를 나타내는 테마
코드는 존재하지 않으므로, "기타" 필터 옵션을 FE에서 만들면 안 된다. 분류에 실패한 클러스터는
테마 없이 저장되고 해당 페이지가 `PARTIAL`이 되며, 다음 이슈가 `issues[]`에 담긴다.

```jsonc
{ "category": "THEME_CLASSIFICATION",
  "code": "THEME_CLASSIFICATION_MISSING",
  "message": "일부 뉴스 주제의 검색 테마를 분류하지 못했습니다." }
```

### A-4-3. 아카이브 검색 파라미터

```http
GET /stock/api/pages/archive
  ?fromDate=2026-08-01
  &toDate=2026-08-31
  &status=READY
  &marketType=KR
  &theme=SECTOR_SEMICONDUCTORS
  &theme=CORPORATE_EVENT_PERFORMANCE
  &q=외국인%20매수
  &page=1
  &size=30
```

| 파라미터 | 타입 | 규칙 |
|---|---|---|
| `fromDate` / `toDate` | `YYYY-MM-DD` | 기존과 동일 |
| `status` | `'READY' \| 'PARTIAL'` | **`FAILED` 제거됨** |
| `marketType` | `'US' \| 'KR'` | 신규 |
| `theme` | `string` **반복** | 신규. 최대 10개 |
| `q` | `string` | 신규. 정규화 후 2~100자 |
| `page` / `size` | `number` | 기존과 동일 (`size` 최대 100) |

**`theme`은 반복 파라미터다.** `theme=A&theme=B` 형태여야 하며 `theme=A,B`처럼 콤마로
join하면 서버가 `"A,B"`를 하나의 코드로 해석해 `422 INVALID_THEME`이 난다. **공용 HTTP
클라이언트의 배열 직렬화 방식을 먼저 확인**하고, 반복 키를 보장하지 않으면 그 부분부터 고친다.

### A-4-4. 필터 결합 규칙

- **복수 `theme`끼리는 OR**, 서로 다른 종류의 필터끼리는 **AND**.
  → `theme=A&theme=B&marketType=KR`은 "(A 또는 B) 그리고 KR".
- **부모 테마를 보내면 서버가 자기 자신과 모든 활성 하위 테마로 확장한다.**
  FE가 URL에 자식 코드를 나열하면 안 된다. 부모 코드 하나만 보낸다. 자식 목록을 FE에서
  펼쳐 넣으면 URL이 길어지고, 카탈로그가 바뀌었을 때 결과가 어긋난다.
- **알 수 없거나 비활성인 코드가 하나라도 있으면 요청 전체가 `422 INVALID_THEME`이다.**
  유효한 것만 골라 처리하지 않는다.
- 결과 단위는 **페이지**이고 같은 페이지가 중복해서 나오지 않는다. 정렬은
  `businessDate DESC` 고정이다.

### A-4-5. `q` 정규화 규칙

서버가 다음 순서로 정규화한다. FE의 클라이언트 검증도 같은 기준으로 맞춰 두면 불필요한
422를 줄일 수 있다.

1. Unicode **NFC** 정규화
2. 영문 **casefold**(소문자화)
3. 앞뒤 공백 제거, 연속 공백을 하나로 축약
4. 정규화 후 길이가 **2~100자**여야 함
5. 공백 기준 토큰 **최대 10개**
6. **모든 토큰은 AND**
7. 유사어·오타 교정·동의어 확장을 **하지 않음**

즉 `q`는 "정확한 토큰 전부 포함" 검색이다. 검색 결과가 없을 때 "더 짧은 키워드로
검색해 보세요" 같은 안내가 실제로 유효하다.

**클라이언트 힌트는 UX용이고 최종 판정은 서버 422다.** 길이·토큰 수 힌트를 보여주되,
서버가 거부하면 그 메시지를 기존 아카이브 오류 패널에 노출한다.

### A-4-6. 검색 단위 상관관계 (결과 없음 문구에 중요)

`q`가 어느 범위 안에서 매칭되는지는 함께 지정한 필터에 따라 달라진다.

| 조합 | 모든 토큰이 만족돼야 하는 단위 |
|---|---|
| `q`만 | 페이지 전체, 하나의 시장 요약, 또는 하나의 클러스터 — **셋 중 한 단위** |
| `marketType` + `q` | 선택한 시장의 요약, 또는 **선택한 시장의 한 클러스터** |
| `theme` + `q` | 선택한 테마를 가진 **같은 클러스터 하나** |
| `marketType` + `theme` + `q` | **한 클러스터**가 세 조건을 모두 만족 |

토큰들이 같은 단위 안의 서로 다른 필드에 흩어져 있는 것은 허용된다(예: 한 토큰은 제목,
다른 토큰은 요약). 하지만 **서로 다른 클러스터가 토큰을 나눠 만족시키는 것은 허용되지
않는다.** 그래서 테마를 함께 지정하면 결과가 눈에 띄게 줄어들 수 있고, 이것은 정상이다.
결과 없음 문구에 적용된 필터를 함께 보여주면 사용자가 원인을 파악하기 쉽다.

### A-4-7. 버전 선택과 `status` 필터의 상호작용

아카이브 쿼리는 다음 순서로 처리된다.

```text
1. READY/PARTIAL 후보만 선택
2. 날짜별 최신 표시 가능 버전 하나를 선택
3. status, 날짜, 시장, 테마, q 필터 적용
4. businessDate 내림차순 정렬
5. 총건수와 페이지네이션 계산
```

**필터가 버전 선택보다 나중에 적용된다.** 따라서 어떤 날짜의 최신 공개 버전이 `PARTIAL`이고
그 이전 버전이 `READY`이면, **`status=READY` 결과에 그 날짜는 포함되지 않는다.** 이전
`READY` 버전으로 대체되지 않는다. 의도된 동작이므로 버그로 신고하지 말 것.

### A-4-8. FE 상태 관리 규칙

- 아카이브 라우트 상태에 `market`, `themes: string[]`, `q`, `page`를 추가한다.
- URL의 반복 `theme` 값을 파싱해 **순서를 유지한 채 중복 제거**하고 **10개에서 자른다.**
- **필터가 바뀌면 `page`를 1로 리셋**한다.
- URL로 들어온 **모르는 테마 코드는 카탈로그 로딩 전까지 보존**한다(로딩 중이라서 모르는
  것일 수 있다). 카탈로그를 받은 뒤 비활성·미지 코드를 **한 번의 replace-state로 정리**한다.
  모르는 코드를 그대로 반복 전송하면 계속 422가 난다.
- 11번째 선택은 막고 **왜 막혔는지 문구로 안내**한다. 조용히 무시하면 안 된다.
- **쿼리 키에서 테마 순서를 정규화**해, 같은 선택 조합이 순서만 다를 때 캐시가 나뉘지 않게 한다.
- 트리 체크박스는 키보드로 조작 가능해야 하고, 라벨은 계층 전체를 알 수 있게 연결한다.
- 적용된 필터를 요약 영역과 결과 없음 문구에 반영하고, **테이블 쿼리와 페이지네이션 링크
  양쪽에 동일한 필터를 전달**한다.

### A-4-9. 자유 태그와의 관계

기존 `tags[]`(클러스터의 자유 태그)는 **화면 표시용으로 계속 유지**되지만 **아카이브 테마
필터값으로 쓰지 않는다.** 태그 문자열을 검색 파라미터로 넘기던 코드가 있으면 제거한다.
테마는 사람이 정의한 고정 카탈로그이고, 태그는 LLM이 자유롭게 붙인 표시용 문자열이라
두 체계는 별개다.

### 준비할 테스트 케이스

중첩된 루트/중간/리프 렌더 / 복수 테마 선택 / 부모 선택 시 자식 코드를 URL에 넣지 않음 /
10개 초과 방지 문구 / 시장 선택 / `q` 입력 / 전체 해제 / 브라우저 뒤·앞으로 복원 /
카탈로그 로딩·오류 상태 / `INVALID_THEME` 오류 패널 / 결과 없음 문구에 적용 필터 표시 /
쿼리 키 정규화.

---

## A-5. B-4 유사 기사 그룹 — 필드는 이미 필수, 값은 대기

요청했던 `duplicateGroupId` / `isGroupRepresentative`는 채택되지 않았다. **서로 다른 두 개념을
하나의 ID로 표현하면 안 된다**는 이유로, 개념을 분리한 계약이 확정되었다.

| 개념 | 뜻 | 필드 |
|---|---|---|
| **exact duplicate** | 여러 **raw 기사**가 하나의 processed 기사로 통합된 관계 | `exactDuplicateCount` |
| **similar group** | 같은 클러스터 안의 **서로 다른 processed 기사**가 같은 사건을 다룬 관계 | `similarGroupId` |

두 값을 합치거나 서로의 대용으로 쓰지 말 것.

### 계약

```jsonc
{
  "articleGrouping": {
    "status": "READY",
    "generatedAt": "2026-08-12T22:20:00Z",
    "issue": null
  },
  "articles": [
    {
      "processedArticleId": 1024,
      "title": "…",
      "publisherName": "…",
      "publishedAt": "2026-08-12T21:10:00Z",
      "originLink": "…",
      "sourceSummary": "…",
      "similarGroupId": "sim-cluster-41-1",
      "isSimilarGroupRepresentative": true,
      "exactDuplicateCount": 2
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `articleGrouping.status` | `'READY' \| 'UNAVAILABLE'` | 그룹 생성 결과 |
| `articleGrouping.generatedAt` | `string \| null` | `UNAVAILABLE`이면 항상 `null` |
| `articleGrouping.issue` | `{ code, message } \| null` | `UNAVAILABLE`이면 항상 존재 |
| `similarGroupId` | `string` | 그룹 식별자. `null` 아님 |
| `isSimilarGroupRepresentative` | `boolean` | 서버가 고른 대표 여부 |
| `exactDuplicateCount` | `number` (0 이상) | 통합된 raw 기사 수 |

같은 필드가 일간 페이지의 `markets[].articleLinks[]`에도 들어 있다.

### 보장

- **`articles[]`는 평면 배열 그대로 유지된다.** 서버가 중첩 구조로 바꾸지 않는다. 그룹은
  FE가 `similarGroupId`로 묶어서 만든다.
- **모든 기사는 정확히 하나의 그룹에 속한다.** 유사 기사가 없는 기사도 자기 혼자인 단독
  그룹을 갖는다. → `similarGroupId`가 `null`이거나 없는 기사는 존재하지 않으므로,
  "그룹 없음" 상태를 다룰 필요가 없다.
- **그룹당 대표는 정확히 하나다.** 대표가 0개이거나 2개인 그룹은 오지 않는다.
- 그룹 ID 형식은 `sim-{clusterUid}-{groupRank}`다. **DB의 내부 ID가 아니고, 파싱해서 의미를
  꺼내 쓰면 안 된다.** 같은 클러스터 응답 안에서만 유효한 식별자로만 취급한다.
- **`exactDuplicateCount`는 canonical 기사 자신을 제외한 통합 raw 기사 수**다. 유사 그룹의
  다른 processed 기사는 여기에 포함되지 않는다. `2`는 "같은 원문 기사가 2건 더 있었다"는
  뜻이지 "이 그룹에 기사가 3건"이 아니다.
- 기사 순서와 그룹 순서는 서버가 정한 순서다. FE는 이 순서를 보존한다.

### 표시 규칙

- `exactDuplicateCount`는 **0보다 클 때만** "원문 중복 N건"으로 표시한다. 0일 때 "0건"을
  보여주지 않는다.
- 유사 그룹의 다른 기사 수를 중복 수로 표시하지 않는다. 두 숫자는 다르다.

### 필터·정렬 후 그룹 재구성

FE의 언론사 필터, 제목 검색, 정렬을 적용한 **뒤에** 보이는 그룹을 다시 만든다.

- 서버 대표 기사가 필터 후에도 남아 있으면 **그대로 대표로 쓴다.**
- 서버 대표가 걸러졌으면 **남은 기사 중 서버 순서상 첫 번째**를 화면 대표로 쓴다.
  점수를 다시 계산하지 않는다.
- **보이는 기사가 1건뿐인 그룹은 접기 UI를 표시하지 않는다.** 펼칠 것이 없는데 토글이
  보이면 혼란을 준다.
- 그룹 자체를 없애는 방향으로 처리하지 않는다. 필터 결과가 이상해도 **기사를 누락시키지
  않는 쪽**이 우선이다.

### 추가 로딩과 그룹 경계

- 20건 단위 추가 로딩은 **그룹 경계에서 끊는다.** 한 그룹이 페이지 경계로 쪼개져 앞부분만
  보이는 상태가 되면 안 된다.
- 기존 증가분(20건) **이상을 커버하는 만큼의 온전한 그룹 수**로 늘린다. 즉 20건을 채우다
  그룹 중간에 걸리면 그 그룹 전체를 포함시킨다.

### `UNAVAILABLE` 처리

```jsonc
{
  "articleGrouping": {
    "status": "UNAVAILABLE",
    "generatedAt": null,
    "issue": {
      "code": "SIMILARITY_GROUPING_FAILED",
      "message": "유사 기사 묶음을 생성하지 못했습니다."
    }
  }
}
```

- 이때도 **모든 기사가 단독 그룹으로 오고, `exactDuplicateCount`는 정상 값으로 제공된다.**
  중복 수는 유사도 계산과 무관하게 산출되기 때문이다. → 중복 표시는 계속 보여준다.
- 기존 평면 목록을 그대로 렌더하고 **접기 UI를 표시하지 않는다.**
- **비차단 안내 문구 하나**만 보여준다.
- **페이지 상태는 `PARTIAL`로 바뀌지 않는다.** 그룹 생성 실패는 클러스터 단위로 격리된다.
  페이지 실패나 분석 실패처럼 보이는 UI를 쓰면 안 된다.
- 실패는 클러스터 단위다. 한 클러스터가 `UNAVAILABLE`이어도 다른 클러스터는 `READY`일 수 있다.

### 현재 서버 동작

스키마상 네 요소(`articleGrouping`과 기사별 세 필드)는 **이미 필수로 응답에 들어 있고**
assembler도 값을 채우지만, 값은 계산 결과가 아니라 고정값이다.

- 클러스터 상세와 일간 페이지 기사 링크 **양쪽 모두** `status: "UNAVAILABLE"`,
  `generatedAt: null`, `issue`는 `SIMILARITY_GROUPING_FAILED`.
- 기사마다 자기 순번으로 만든 단독 그룹 ID(`sim-{clusterUid}-1`, `-2`, …).
- `isSimilarGroupRepresentative`는 전부 `true`.
- `exactDuplicateCount`는 전부 `0`.

따라서 **지금 FE가 붙여도 타입 오류가 없고 `UNAVAILABLE` 경로는 실서버로 검증된다.**
`READY` 경로만 fixture로 개발한다.

### 준비할 테스트 케이스

`READY` 다건 그룹 접기·펼치기 / 단독 그룹(토글 없음) / 필터로 서버 대표가 사라진 경우 /
`exactDuplicateCount` 0과 양수 / `UNAVAILABLE` 평면 렌더 + 안내 문구 / 그룹 경계 추가
로딩 / 키보드 조작과 ARIA 확장 상태.

---

## A-6. B-5 인접 영업일 — 실데이터 사용 가능

### 계약

```http
GET /stock/api/pages/navigation?businessDate=2026-08-13
```

```jsonc
{
  "businessDate": "2026-08-13",
  "pageExists": false,
  "previousBusinessDate": "2026-08-12",
  "nextBusinessDate": "2026-08-14"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `businessDate` | `YYYY-MM-DD` | 요청한 날짜 그대로 |
| `pageExists` | `boolean` | 그 날짜에 **표시 가능한** 페이지가 있는지 |
| `previousBusinessDate` | `string \| null` | 직전에 실제로 페이지가 있는 날짜 |
| `nextBusinessDate` | `string \| null` | 직후에 실제로 페이지가 있는 날짜 |

### 보장

- **네 키 모두 항상 존재한다.**
- `null`은 **"그런 이웃이 없음"**이지 "계산하지 못함"이 아니다. 가장 오래된 날짜의
  `previousBusinessDate`는 `null`이다.
- **조회 범위 제한이 없다.** 기존 ±90일 우회가 가진 문제(90일 밖에 이웃이 있으면 버튼이
  잘못 비활성화됨)가 사라진다.
- **유효한 날짜면 페이지가 없어도 200이다.** `pageExists: false`여도 이전·다음 탐색은
  유효하므로, 날짜 없음 화면에서도 좌우 이동 버튼을 활성화할 수 있다.
- **요청한 날짜 자신은 previous/next에 포함되지 않는다.**
- **달력 계산이 아니라 DB에 표시 가능한 페이지가 존재하는 날짜다.** `businessDate ± 1일`을
  FE에서 계산해 대체하면 안 된다. 주말·공휴일·배치 실패일이 전부 건너뛰어진다.
- `FAILED`만 존재하는 날짜는 이웃 계산에서 제외된다(A-1-9 참조).
- 날짜 형식 오류는 422, DB 오류만 500이다. 기존 페이지 읽기와 동일한 인증 정책이다.

상태 조합은 다음과 같이 나온다.

| `pageExists` | prev | next | 상황 |
|---|---|---|---|
| `true` | 값 | 값 | 중간 날짜 |
| `true` | `null` | 값 | 가장 오래된 페이지 |
| `true` | 값 | `null` | 최신 페이지 |
| `false` | 값 | 값 | 페이지 없는 날짜(휴장일 등), 양쪽 이동 가능 |
| `false` | `null` | `null` | 페이지가 하나도 없음 |

### 어느 경로를 쓸 것인가

일간 페이지 응답에도 같은 정보가 `navigation.previousBusinessDate` /
`navigation.nextBusinessDate`로 들어 있다. **두 경로는 동일한 조회 로직을 쓰므로 결과가
같다.** 중복 요청을 피하기 위해:

- **이미 일간 페이지를 로드한 화면**에서는 그 응답의 `navigation`을 쓴다. 별도 호출하지 않는다.
- **페이지가 없는 날짜(날짜 없음 라우트)** 처럼 페이지 응답 자체가 없는 경우에만 이
  독립 엔드포인트를 호출한다.
- 상태별로 **한 경로만 실행**되게 한다. 둘 다 켜져 있으면 같은 정보를 두 번 받는다.

### FE 구현 규칙

- 쿼리 키는 **businessDate만으로** 구성한다. **아카이브 목록 캐시를 재사용하지 않는다.**
  용도가 다르고 무효화 시점도 다르다.
- 로딩·오류 상태에서는 **추측하지 말고 양쪽 버튼을 비활성화**한다. 이전 응답의 값을 남겨
  두고 이동시키면 없는 날짜로 이동할 수 있다.
- 버튼 라벨에는 실제 날짜를 표시한다. 서버가 실재하는 날짜만 주므로 라벨과 실제 이동
  대상이 어긋나지 않는다.

### 준비할 테스트 케이스

중간 날짜 / 가장 오래된 날짜(prev `null`) / 최신 날짜(next `null`) / 페이지 없는 날짜에서
양쪽 이동 / 데이터 없음(양쪽 `null`) / 로딩·오류 시 양쪽 비활성 / 이미 로드된 페이지에서는
추가 요청이 발생하지 않음.

---

## A-7. 제거 대상 (마이그레이션 체크리스트)

FE/BE는 한 번의 조정된 배포로 나가므로 **구버전 호환 분기를 남기지 않는다.** 병행 필드,
dual-write, deprecated 계약은 설계상 존재하지 않는다.

| 제거 대상 | 대체 |
|---|---|
| `summary.analysis: string[]` 렌더러 | `summary.sections[]` |
| 문단 텍스트에서 소제목을 추론하던 휴리스틱 | 서버 고정 `kind` / `title` |
| 클러스터 `lastUpdatedAt`을 분석 시각으로 표시 | `summary.analysisGeneratedAt` |
| 아카이브 ±90일 조회 기반 인접 날짜 계산 (윈도 상수, 날짜 시프트, 정렬, 아카이브 의존) | `GET /pages/navigation` |
| 공개 아카이브의 `status=FAILED` 옵션과 라우트 허용 목록 | `READY` / `PARTIAL`만 (운영 화면은 변경 없음) |
| 공개 결과 테이블의 `FAILED` 전용 표시 분기 | 제거. 단 알 수 없는 상태에 대한 방어 렌더는 유지 |
| 자유 `tags`를 아카이브 필터값으로 사용 | `theme` 파라미터 |
| `processedArticleId?` 옵셔널 / `null` 허용 타입 | 필수 `number` |
| `duplicateGroupId` / `isGroupRepresentative` 전제 코드 | `similarGroupId` / `isSimilarGroupRepresentative` / `exactDuplicateCount` |
| "백엔드가 텍스트 배열만 준다"는 설명 주석 | 삭제 |

**유지되는 것** — `globalHeadline`, 시장별 `analysis`(`background` / `keyThemes` / `outlook`),
표시용 `tags`, 평면 `articles[]`, 일간 페이지의 `navigation`, 페이지 단위 아카이브 응답과
날짜 내림차순 정렬.

---

## A-8. FE 작업 순서와 주의사항

실데이터 의존도 순으로 진행하면 대기 없이 작업할 수 있다.

1. **B-5 인접 날짜** — 서버가 이미 동작한다. 우회 로직 제거까지 완결 가능.
2. **B-1 오늘의 핵심** — 서버가 이미 값을 채운다. 완결 가능.
3. **B-2 / B-4 UI** — 타입·매퍼·컴포넌트·테스트를 fixture 기반으로 선구현.
   두 항목 모두 현재 서버는 `UNAVAILABLE`을 반환하므로, **`UNAVAILABLE` 경로는 실서버로,
   `READY` / `PARTIAL` 경로는 mock으로** 검증한다. 백엔드가 값을 채우면 코드 변경 없이 연결된다.
4. **B-3 아카이브 검색** — 엔드포인트가 없다. URL 상태 파싱, 트리 UI, 쿼리 키까지는 만들 수
   있으나 실호출 검증은 백엔드 완료 후.

주의사항:

- **DTO 타입은 백엔드가 생성한 OpenAPI 스펙을 기준으로 교체한다.** 구버전 payload를
  수용하려고 손으로 optional을 붙이지 않는다. 호환 계약이 없으므로 optional은 실제 계약을
  가리는 거짓 정보가 된다.
- **fixture도 새 계약으로 전부 갱신한다.** 필수 필드를 추가하기 싫어서 옵셔널로 바꾸는
  방향은 금지다.
- 계약이 확정된 것과 **값이 채워진 것은 다르다.** 화면을 확인할 때 `UNAVAILABLE`이 보이면
  버그가 아니라 아직 백엔드 값이 연결되지 않은 상태일 수 있다. A-0 표를 먼저 확인한다.
- 반복 쿼리 파라미터(`theme=A&theme=B`) 직렬화를 **B-3 작업 착수 전에 확인**한다.
- 배포는 FE/BE를 함께 테스트한 뒤 한 번에 한다. 중간 배포로 한쪽만 먼저 나가면 계약이 깨진다.
