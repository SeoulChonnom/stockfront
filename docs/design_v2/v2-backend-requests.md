# v2 백엔드 개선 요청 목록

이 문서는 Market Brief UI v2 리뉴얼 과정에서 프런트가 이미 "되돌리기 쉬운 기본안"으로
구현해 둔 지점 가운데, 실제로 제품 동작을 개선하려면 백엔드 계약이 필요한 항목을
정리한 것이다. `docs/design_v2/handoff_v2/README.md` §14(Backend Dependencies · Open
Decisions)와 `docs/design_v2/v2-decisions.md`의 결정 로그를 근거로 하며, 프런트는 이
문서의 계약이 도착하기 전까지 각 항목에 적힌 기본안으로 안전하게 동작한다.

우선순위는 **P-01(사용자 역할/권한)이 최우선**이다 — 담당 PO가 백엔드에 per-user
permissions를 추가하기로 이미 확정했기 때문이다. 나머지는 README §14에 이미 식별되어
있던 의존성을 같은 형식으로 정리한 것이다.

---

## P-01. 사용자 역할/권한 (최우선 · 확정된 작업)

### 현재 상태

- `POST /api/users/token`(별도 인증 서비스, `docs/api_spec_doc.md` §2-4 — 이 배치/페이지
  API 명세서에는 문서화되어 있지 않다)의 응답은 오늘 아래 형태만 보장된다:

  ```json
  {
    "accessToken": "eyJhbGciOi..."
  }
  ```

- 프런트는 `src/lib/auth-bootstrap.ts`에서 이 응답을 파싱해 `accessToken`만 읽는다.
  역할/권한 개념은 백엔드에 전혀 없다 — README §14 D-01, `docs/api_spec_doc.md` 전체에
  role/permission 관련 필드나 엔드포인트가 없음을 확인했다.
- 그 결과 `src/lib/capabilities.ts`가 오늘 모든 사용자를 사실상 `'operator'`로
  취급한다(아래 "생기면 바뀌는 프런트 지점" 참고) — 즉 **오늘 모든 사용자는 이미
  `/ops/batches` 전체 접근 권한을 가지고 있다.**

### 제안하는 응답 확장

기존 필드는 그대로 두고, 다음 필드를 **선택(optional)**으로 추가한다:

```json
{
  "accessToken": "eyJhbGciOi...",
  "role": "VIEWER"
}
```

| 필드   | 타입                        | 필수 | 설명                                        |
| ------ | --------------------------- | ---- | ------------------------------------------- |
| role   | string(`"VIEWER"` \| `"OPERATOR"`) | N    | 사용자 역할. 대소문자는 프런트가 관대하게 처리한다. |

### 왜 `role` 문자열이고 `permissions[]` 배열이 아닌가

두 가지 선택지를 비교했다:

- **(A) `role: 'VIEWER' | 'OPERATOR'` 단일 필드 — 채택**
- (B) `permissions: string[]` (예: `["ops.view", "ops.trigger", ...]`) 세분화 배열

현재 프런트의 권한 모델(`src/lib/capabilities.ts`)은 역할 2종(Viewer/Operator)이
`Capability` 4종(`ops.view`, `ops.trigger`, `ops.viewLogs`,
`ops.advancedTriggerOptions`)을 **전부-아니면-전무**로 묶어서 부여하는 고정 매핑이다
(README §10 Role/Capability Map). 오늘 시점에 역할별로 capability가 갈리는 시나리오가
없으므로, `permissions[]`가 주는 세분성은 지금 당장 쓸 데가 없고 백엔드에 더 많은
필드 설계·직렬화 부담만 지운다. `role` 단일 필드가 계약을 더 작게 만들고, 프런트
파싱 로직도 한 줄(`normalizeRole`)로 끝난다. **세분화된 권한이 실제로 필요해지는
시점(예: Operator 중 일부만 `force` 허용 — D-11)이 오면 그때 `permissions[]`나
별도 필드를 추가로 논의하면 된다** — 지금 미리 설계하지 않는다.

### 하위 호환 보장

- `role` 필드는 **선택**이다. 필드가 없거나, 문자열이 아니거나, `VIEWER`/`OPERATOR`로
  (대소문자 무관) 정규화되지 않는 값이면 프런트는 **부트스트랩을 실패시키지 않고**
  `'operator'` 폴백으로 넘어간다 — 오늘의 동작과 100% 동일하다.
- 즉 이 필드는 **하위 호환을 깨지 않고 언제든 추가할 수 있다.** 백엔드가 준비되는
  대로, 프런트 배포 없이도(다음 로그인부터) 바로 적용된다.

### 생기면 바뀌는 프런트 지점

- **`src/lib/auth-bootstrap.ts`의 파싱 로직만** 이 필드를 이미 읽고 있다(`readRole`).
  즉 백엔드가 이 필드를 보내기 시작하는 순간 **프런트 코드 변경이 전혀 필요 없다.**
- `src/lib/capabilities.ts`는 이미 `auth-bootstrap.ts`가 파싱한 role을 override 다음
  우선순위로 소비하도록 구현되어 있다(`getRole()` 우선순위: 1. `setRoleOverride` →
  2. auth-bootstrap이 파싱한 role → 3~4. 폴백 `'operator'`). `capabilities.ts`가
  프런트 전체에서 role/capability 판단의 **단일 소비 지점**이므로, 다른 화면·컴포넌트
  코드는 전혀 건드릴 필요가 없다.

### 반드시 함께 필요한 것 — 서버 측 강제

**클라이언트 게이팅은 보안 경계가 아니다.** `capabilities.ts` 파일 상단 주석에도 이
경고를 명시해 두었다. `role` 필드를 응답에 추가하는 것과는 **별개로**, 서버가 반드시:

1. `/ops/*` 관련 조회(배치 목록·상세, `errorMessage`/`logSummary` 등)를 Viewer 토큰으로
   호출하면 **403**을 반환해야 한다.
2. 배치 실행(trigger, `POST /batch/market-daily`)을 Viewer 토큰으로 호출하면 **403**을
   반환해야 한다.

프런트가 운영 메뉴를 숨기고 버튼을 비활성화해도, 서버가 위 두 가지를 강제하지 않으면
누구든 API를 직접 호출해 우회할 수 있다.

---

## 나머지 이미 식별된 백엔드 의존성 (README §14 근거)

형식: **현재 UI 동작(fallback) | 백엔드에 필요한 것 | 생기면 바뀌는 프런트 지점**

### `metadata.isLatest`

- **현재 UI 동작(fallback)**: `docs/api_spec_doc.md`의 `DailyPageResponse['metadata']`에
  이 필드가 없다(§4 확인). 디자인 프로토타입의 `fixtures.js`(`handoff_v2/fixtures.js:191`
  등)에는 존재하지만 실제 API 계약에는 없는 값이다. 프런트 mapper(`src/lib/mappers.ts`)는
  이 필드를 optional-boolean으로 방어적으로 읽되, 응답에 없으면 `null`로 취급하고
  "최신 여부" 판단은 기존 로직(mode prop `latest`/`archive` + route)에만 의존한다
  (`src/lib/view-models.ts`).
- **백엔드에 필요한 것**: `GET /pages/daily/latest`·`GET /pages/daily` 응답의
  `metadata`에 `isLatest: boolean` 필드가 실제로 내려오는지 확인, 오면 계약에 명시.
- **생기면 바뀌는 프런트 지점**: `src/lib/mappers.ts`(이미 필드를 읽는 코드가 있으므로
  파싱 자체는 변경 불필요), 헤더에 "최신 여부"를 route 추론 대신 서버 값으로 직접
  표시하는 view-model 로직.

### 파이프라인 단계별 status/duration

- **현재 UI 동작(fallback)**: `/ops/batches` 상세 화면(§7-6)은 배치 파이프라인을
  `app/batch/steps/` 모듈명 기준 8단계(작업 생성 · 뉴스 수집 · 지수 수집 · 중복 제거 ·
  클러스터 구성 · AI 요약 생성 · 페이지 스냅샷 · 작업 종료)로 **가정**하고 `PROPOSED ·
  BACKEND` 배지를 붙인다. 실패 지점은 `errorCode` 문자열에서 키워드를 추론해 `FAILED`로
  표시하고, 그 이후 단계는 "이전 단계 실패로 건너뜀"(`SKIPPED`)으로 표시한다. **소요
  시간(duration)은 절대 임의로 만들어내지 않는다** — 값이 없으면 표시하지 않는다.
- **백엔드에 필요한 것**: 배치 상세 응답에 단계별 `{ stepName, status, durationSeconds }`
  구조화 필드.
- **생기면 바뀌는 프런트 지점**: `src/lib/mappers.ts`(배치 상세 매핑), 파이프라인 단계
  컴포넌트에서 `errorCode` 키워드 추론 로직 제거 + `PROPOSED · BACKEND` 배지 제거.

### D-05. 인접 business date 이동 API

- **현재 UI 동작(fallback)**: Archive의 "이전/다음 날짜" 이동은 날짜 산술(±1일)로
  낙관적 링크를 만들고, 실제로 그 날짜에 페이지가 없으면 404 상태 화면으로 표시한다.
  즉 "다음 날짜에 데이터가 있는지"를 미리 알 방법이 없다.
- **백엔드에 필요한 것**: 특정 `businessDate` 기준으로 실제 존재하는 이전/다음
  business date를 반환하는 API(또는 기존 아카이브 목록 API의 커서 확장).
- **생기면 바뀌는 프런트 지점**: Archive 날짜 네비게이션 컴포넌트가 날짜 산술 대신
  서버가 알려준 실제 존재 날짜로만 링크를 활성화 — 존재하지 않는 날짜로의 이동 시도
  자체가 사라지고 404 상태 화면 분기가 불필요해진다.

### D-06. 동일 날짜 복수 version 목록/선택

- **현재 UI 동작(fallback)**: 같은 `businessDate`에 여러 `versionNo`가 있어도 `pageId`
  우선 조회 + 최신 버전만 `pageId · vN` mono 표기로 보여준다. "다른 버전 보기" UI 자체가
  없다.
- **백엔드에 필요한 것**: 특정 날짜의 version 목록을 반환하는 API, 그리고 특정 version을
  선택 조회하는 계약(현재 `GET /pages/daily?versionNo=`는 이미 있으나 "목록"이 없다).
- **생기면 바뀌는 프런트 지점**: `src/lib/query-hooks.ts`에 version 목록 조회 훅 추가,
  페이지 헤더에 버전 선택 드롭다운 컴포넌트 신규 추가.

### D-11. Trigger 고급 옵션(`force`/`rebuildPageOnly`) 권한·audit 정책

- **현재 UI 동작(fallback)**: 고급 옵션 토글 뒤에서 `force`("이미 생성된 스냅샷이
  있어도 새 versionNo로 다시 생성합니다. 기존 버전은 보존됩니다.")와
  `rebuildPageOnly`("뉴스·지수를 재수집하지 않고 저장된 정제 결과로 페이지만 다시
  만듭니다.")를 Operator 전체에게 동일하게 허용한다. 두 옵션 옆에 "실행 권한과 audit
  정책은 백엔드 확인이 필요합니다(D-11)" 경고를 고정 노출한다.
- **백엔드에 필요한 것**: 옵션별로 별도 권한이 필요한지(예: `force`는 Admin만),
  그리고 이 두 옵션 사용에 대한 audit 로그 정책 확정.
- **생기면 바뀌는 프런트 지점**: Trigger 다이얼로그에서 옵션별 노출 조건을
  `capabilities.ts`의 세분화된 capability로 분기(현재는 `ops.advancedTriggerOptions`
  하나로 묶여 있음), 고정 경고 문구 제거.

### D-13. PARTIAL 상태의 누락 섹션 구조화 필드

- **현재 UI 동작(fallback)**: `PARTIAL` 상태일 때 문자열 `partialMessage`를 상단
  배너와 관련 섹션에 그대로 노출한다. "어떤 섹션이 왜 빠졌는지"를 구조적으로 알 방법이
  없어 문자열을 그대로 사람이 읽게 한다.
- **백엔드에 필요한 것**: 어떤 섹션이 누락됐는지, 원인 코드가 무엇인지를 담은 구조화
  필드(예: `missingSections: [{ section, reasonCode }]`).
- **생기면 바뀌는 프런트 지점**: `src/lib/mappers.ts`·`view-models.ts`에서 구조화 필드
  파싱 추가, PARTIAL 배너/섹션 컴포넌트가 문자열 그대로 노출 대신 섹션별 아이콘+사유로
  세분화.

### 401 vs 403 오류 코드 구분 보장

- **현재 UI 동작(fallback)**: `src/lib/api/client.ts`는 HTTP status 코드 기준으로
  401(재인증 유도)과 403(권한 없음 화면)을 분기한다. `docs/api_spec_doc.md` §6은 상태
  코드 정책만 정의하고, 응답 body의 오류 코드 필드가 401/403 각각에서 항상 채워진다는
  보장은 문서에 없다.
- **백엔드에 필요한 것**: 401과 403 모두 status 코드뿐 아니라 body에도 일관된 오류
  코드 필드(예: `error.code: 'AUTH_EXPIRED' | 'FORBIDDEN'`)를 항상 포함한다는 계약
  보장.
- **생기면 바뀌는 프런트 지점**: `src/lib/api/client.ts`의 오류 분기 로직이 status 코드
  단독 판단에서 status + `error.code` 병행 판단으로 강화, 오류 메시지가 코드 기준으로
  더 정확해짐.

### 409 충돌 응답에 기존 `jobId` 포함

- **현재 UI 동작(fallback)**: Trigger 요청이 409(`BATCH_ALREADY_RUNNING`)로 실패하면
  현재 `docs/api_spec_doc.md` §5-1 Error Code 표에는 기존 실행 중인 job의 식별자가
  응답에 포함된다는 보장이 없다. 프런트는 body에 existing jobId가 없을 수 있다고
  가정하고, 있으면 "job N 열기" 버튼을 조건부로 추가하고 없으면 생략한다.
- **백엔드에 필요한 것**: 409 응답 body에 현재 실행 중인 `jobId`를 항상 포함.
- **생기면 바뀌는 프런트 지점**: Trigger 실패 다이얼로그의 "job N 열기" 버튼이 조건부
  렌더에서 항상 렌더로 바뀜(A-06 가정 해제).

### 자동 refresh interval/SLA 정책 (D-16)

- **현재 UI 동작(fallback)**: 자동 갱신이 구현되어 있지 않다. 사용자가 수동으로 다시
  불러오기 버튼을 눌러야 한다.
- **백엔드에 필요한 것**: 배치 완료까지 걸리는 SLA와, 그에 맞는 폴링 interval 정책
  (예: 30초 간격이 서버 부하를 허용 범위 안에서 감당 가능한지).
- **생기면 바뀌는 프런트 지점**: `src/lib/query-hooks.ts`에 정책에 맞는
  `refetchInterval` 도입, "자동 갱신 없음" 상태 문구 제거.

---

## 참고 문서

- `docs/design_v2/handoff_v2/README.md` §10 (Role/Capability Map), §14 (Backend
  Dependencies · Open Decisions)
- `docs/design_v2/v2-decisions.md` (동일 결정들의 상세 근거 로그)
- `docs/api_spec_doc.md` (현재 확정된 API 계약 — 이 문서에 없는 필드는 모두 위 목록의
  대상)
- `src/lib/capabilities.ts`, `src/lib/auth-bootstrap.ts` (P-01 관련 구현 및 교체 지점)
