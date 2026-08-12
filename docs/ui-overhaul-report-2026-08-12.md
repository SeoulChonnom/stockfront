# Market Brief UI/UX 개선 결과 보고서 (P0 · P1)

- **작성일**: 2026-08-12
- **브랜치**: `feat/market-brief-ui-overhaul`
- **기준 커밋**: `094bb43` → **HEAD** `b67f285` (21개 커밋)
- **설계서**: `docs/superpowers/specs/2026-08-12-market-brief-ui-overhaul-design.md`
- **백엔드 요청**: `docs/backend-requests-2026-08-12.md`

이 문서의 모든 수치는 실제 명령 출력에서 가져온 것이다. 얻지 못한 항목은 얻지 못했다고 적었다.

---

## 1. 변경한 파일 목록

`git diff --stat 094bb43..HEAD` 기준 **75개 파일, +3,587 / −670**.

### 신규 (17)

| 경로 | 역할 |
|---|---|
| `scripts/contrast-audit.mjs` | WCAG 대비 감사. AA 미달 시 비영 종료 |
| `src/lib/audience-copy.ts` / `.test.ts` | 권한별 문구 선택 (순수 함수) |
| `src/components/state/direction-indicator.tsx` / `.test.tsx` | `▲`/`▼` + sr-only 등락 표기 |
| `src/components/state/direction-text-class.ts` | 방향 → 색상 토큰 클래스 |
| `src/components/shell/use-narrow-viewport.ts` | `matchMedia` 기반 ≤640px 구독 |
| `src/components/ui/button.test.tsx` | 터치 영역 회귀 방지 |
| `src/pages/market-overview/index-order.ts` / `.test.ts` | 대표 지수 표시 순서 |
| `src/pages/market-overview/market-index-cards.tsx` / `.test.tsx` | 모바일 지수 카드 |
| `src/pages/market-overview/market-index-table.test.tsx` | 데스크톱 지수 표 |
| `src/pages/market-overview/market-tabs.tsx` / `.test.tsx` | US/KR 탭 |
| `src/pages/market-overview/market-tab-ids.ts` | 탭/패널 id 생성 |
| `src/pages/market-overview/page-data-details.tsx` | `데이터 정보` 접기 |
| `src/pages/market-overview/use-adjacent-snapshot-dates.ts` / `.test.tsx` | 실존 인접 스냅샷 날짜 |
| `src/pages/cluster-detail/cluster-article-controls.ts` / `.test.ts` | 기사 정렬·필터·검색 |
| `src/pages/cluster-detail/cluster-articles-list.test.tsx` | 위 컨트롤의 상태 배선 |
| `src/pages/cluster-detail/cluster-analysis.test.tsx` | AI 분석 계층 |
| `src/pages/not-found-page.test.tsx` | 403/404 배지 권한 분리 |

### 삭제 (2)

| 경로 | 사유 |
|---|---|
| `src/pages/market-overview/market-compare-strip.tsx` | `MarketCompareStrip`(지수 1개만 노출)과 `MarketSectionNavigation`(섹션 이동) 모두 탭으로 대체 |
| `src/pages/market-overview/date-utils.ts` | `shiftBusinessDate` 달력 산술 폐기 후 완전히 미사용 |

### 주요 수정

`src/styles/base.css`, `src/index.css`(토큰) · `src/components/ui/button.tsx` · `src/components/shell/nav-rail.tsx` · `src/lib/view-models.ts`, `src/lib/mappers/market.ts`, `src/lib/mappers/cluster.ts` · `src/lib/query-hooks.ts` · `src/pages/market-overview-page.tsx` 및 `market-overview/*` 전체 · `src/pages/cluster-detail-page.tsx` 및 `cluster-detail/*` · `src/pages/archive-search-page.tsx`, `archive-search/archive-results-table.tsx` · `src/pages/batch-operations-page.tsx` · `src/components/root-error-boundary.tsx`, `src/App.tsx` · e2e 스펙 5종.

### 커밋 목록

```
b67f285 fix(market-overview): gate the empty-markets reason text behind canViewOps
4a7eeae test(e2e): lock responsive, tab keyboard, and copy isolation
d0bb063 fix(archive-search): gate the raw partial-message subline behind canViewOps
37d3dc4 fix(ops): clear the detail panel when filters exclude the selection
554e5fc fix(archive): close the 404-to-404 loop on the not-found and error shells
a2f6361 fix(archive): only navigate to business dates that have a snapshot
8406e6b feat(cluster): page related articles instead of expanding all
196f4d4 feat(cluster): make AI analysis readable at one type size
f69c127 feat(market): reveal key issues progressively
30e3b6a fix(market): stop signalling the selected tab with colour alone
c7af10d feat(market): split US and KR into keyboard-accessible tabs
5bd8c99 fix(market): stop claiming a decline when changeValue is missing
60d605a feat(market): show every representative index in a fixed order
0b0d21d fix(perm): close remaining raw-English-error-code leaks on regular-user screens
f426407 fix(perm): audience-gate error codes and raw messages in fetch presentations
8afd293 feat(perm): split operator wording out of regular-user copy
38950f6 fix(a11y): split directionTextClass into its own module
9eae13e feat(a11y): add non-colour direction indicator
9a9aa33 feat(a11y): guarantee 44px touch targets on buttons
f8a8865 feat(ui): raise type scale to the readability minimums
45c3251 fix(a11y): raise light-theme token contrast to WCAG AA
```

---

## 2. 주요 구조 및 디자인 변경 요약

### 2-1. 정보 구조 — 최신 브리프

가장 큰 변경이다. 이전에는 US와 KR 섹션이 한 페이지에 세로로 이어 붙어 있었고, 내부 처리 수치가 상단을 차지했다.

```
[상태 배지 · 기준일 · 생성 시각]
[h1 = 글로벌 헤드라인]          ← 이전엔 h1이 15px 흐린 글씨, 헤드라인은 <p>였다
[데이터 누락 경고 (해당 시)]
[ US | KR ]                     ← ARIA 탭. ?market= 로 상태 유지
  ├ 대표 지수 전체              ← 데스크톱 표 / ≤640px 카드
  ├ 시장 요약 · 핵심 테마
  ├ 핵심 이슈 5건(모바일 3건) + "이슈 N건 더 보기"
  └ 근거 원문
[▸ 데이터 정보]                 ← 원문/정제/클러스터 수, pageId, versionNo (기본 접힘)
```

**대표 지수 누락의 원인은 백엔드가 아니었다.** 백엔드는 `markets[].indices[]`에 모든 지수를 내려주고 있었고, 상단 비교 스트립이 `indices[0]` 하나만 대표로 골라 쓰고 있었다. 이제 정렬 규칙(`^DJI → ^GSPC → ^IXIC`, `KS11 → KQ11`)을 앞에 두고 목록에 없는 코드(`^RUT`, `^VIX`, `KRX300`, `USDKRW`)는 백엔드 순서대로 뒤에 붙이며, **하나도 제외하지 않는다.**

### 2-2. 디자인 토큰

시각 변경은 전부 `src/styles/base.css`(토큰)와 `src/index.css`(`@theme inline`)에서 시작한다.

| 토큰 | 이전 | 데스크톱 | ≤640px |
|---|---|---|---|
| `--fs-body` | 13.5px | **15px** | **16px** |
| `--fs-sm` | 12.5px | 13.5px | 13.5px |
| `--fs-label` | 11px | **13px** | **13px** |
| `--fs-h3` | 14px | **17px** | 17px |
| `--fs-h2` | 17px | 20px | 19px |
| `--fs-h1` | 22px | 28px | 24px |
| `--fs-display` | 26px | 30px | 24px |
| `--lh-body` | 1.5 | 1.65 | 1.65 |
| `--tap-min` | (없음) | **44px** | 44px |

`--fs-h3`(17px)가 `--fs-body`(15px, 모바일 16px)보다 항상 크므로 "H3가 본문보다 작지 않도록"이 토큰 수준에서 보장된다. `#root`의 기본 글자 크기만 14px→15px로 올렸고 `html`은 건드리지 않았다 — `rem` 기준이 `html`이므로 **Tailwind 간격 유틸리티는 그대로다.**

### 2-3. 색상 대비

라이트 테마 3개 토큰만 바꿨다. 다크 테마는 실측상 이미 전부 AA를 통과해 손대지 않았다.

| 토큰 | 이전 | 이후 |
|---|---|---|
| `--text-faint` | `#7288a5` | `#576d8a` |
| `--up` | `#0d8b5f` | `#07724c` |
| `--success` | `#0d8b5f` | `#07724c` |

### 2-4. 색상 비의존 상태 표기

`DirectionIndicator`가 `▲`/`▼`를 `aria-hidden`으로 두고 `상승`/`하락`을 `.sr-only`로 읽어준다. 지수 표·카드가 모두 이걸 쓴다.

작업 중 **실제 결함 하나가 드러났다.** 매퍼가 `changeValue`가 없을 때 방향을 `'down'`으로 기본 처리하고 있었다. 이전에는 색이 틀리는 정도였지만, 화살표와 스크린리더용 "하락" 텍스트를 붙이는 순간 **없는 사실을 단언하게 된다.** `direction`에 `'none'`을 추가해 방향을 모를 때는 기호도 단어도 내보내지 않는다.

### 2-5. 점진적 정보 공개

- 핵심 이슈: 데스크톱 5건 / 모바일 3건 + `이슈 N건 더 보기`. 요약 3줄 클램프, 태그 4개 상한.
- 중복 인터랙션 정리: 행마다 있던 `이슈 상세` 버튼을 없애고 제목 링크만 상세 진입점으로 남겼다. `원문`/`네이버 미러`는 메타줄 텍스트 링크로 격하했다.
- 관련 기사: `남은 94건 더 보기` 일괄 전개 → **20건 단위 로딩** + 정렬(최신순/관련도순) · 언론사 필터 · 제목 검색.

---

## 3. 권한별 변경 사항

`can('ops.view')`를 받는 순수 함수 모듈(`src/lib/audience-copy.ts`) 한 곳에서 문구를 고른다.

### 일반 사용자

| 위치 | 이전 | 이후 |
|---|---|---|
| 사이드바 설명 | `일간 시장 브리프 · 운영 콘솔` | `AI 시장 브리프` |
| 데이터 누락 경고 | "배치 운영에서 같은 기준일로 다시 실행할 수 있습니다" | 참고용 안내 + `상세 정보` 접기(영향 시장 / 누락 데이터 / **사용된 데이터 기준일** / 마지막 갱신) |
| 헤드라인 미생성 | "AI 요약 단계가 실패…배치 로그에서 원인을 확인하세요" | 원인·로그 언급 제거 |
| 시장 요약 미생성 | "기사가 임계값에 미달했거나 AI 요약이 실패한 경우" | 파이프라인 표현 제거 |
| 지수 없음 | "provider 응답 실패 시 부분 실패로 처리…배치 운영에서 실행" | `지수 데이터가 없습니다` |
| 오류 화면 배지 | `404 · PAGE_NOT_FOUND` 등 영문 코드 | 배지 자체를 렌더링하지 않음 |
| 오류 본문 | 원시 `error.message` | 사람이 읽는 한국어 문구 |
| 빈 시장 패널 | "이 날짜의 배치가 뉴스 수집 단계에서 실패해…" | 배치·수집 어휘 제거 |
| 아카이브 결과 표 | 백엔드 원문 `partialMessage`("provider 타임아웃" 등) | 미노출 |

"사용된 데이터 기준일"은 추측이 아니다. `MarketMetadataResponse.sourceDate` / `expectedSessionDate`가 API 스펙에 이미 있었으나 view model에 매핑되지 않은 상태였고, 이번에 매핑했다.

### 운영자

배치 운영 메뉴·최근 7일 실패 배지·배치 상세 이동 버튼·파이프라인 오류·영문 오류 코드·로그를 **전부 그대로 유지한다.** 운영자 문구는 바이트 단위로 동일함을 리뷰에서 확인했다.

### 직접 URL 접근

`/ops/batches`에 일반 사용자가 직접 접근하면 기존 403 화면이 그대로 뜬다. 라우트 게이트(`can('ops.view')`)는 손대지 않았다.

---

## 4. 기존 동작에 영향을 줄 수 있는 변경 사항

리뷰어가 실제로 의존할 절이므로 구체적으로 적는다.

1. **한 번에 한 시장만 렌더링된다.** 이전에는 US·KR 섹션이 동시에 DOM에 있었다. 두 시장을 동시에 가정한 딥링크·자동화·스크래핑은 `?market=us` / `?market=kr`로 대상을 지정해야 한다.
2. **`섹션 이동` sticky 내비게이션과 `mk-section-*` 앵커가 사라졌다.** 해당 앵커로 들어오던 링크는 더 이상 동작하지 않는다.
3. **본문 글자가 13.5px → 15px(모바일 16px)로 커졌다.** 모든 화면의 세로 길이와 줄바꿈이 달라진다. 픽셀 단위 스크린샷 비교를 하는 도구는 전부 기준값을 다시 잡아야 한다.
4. **`MarketIndex['direction']`에 `'none'`이 추가됐다** (`'up' | 'down'` → `'up' | 'down' | 'none'`). 이 타입을 소비하는 외부 코드는 새 멤버를 처리해야 한다.
5. **`src/pages/market-overview/date-utils.ts`가 삭제됐다.** `shiftBusinessDate`, `getTodayBusinessDateKst`를 import하던 코드는 깨진다(`getTodayBusinessDateKst`는 `src/lib/kst-date.ts`에 남아 있다).
6. **아카이브 상세를 열 때마다 아카이브 목록 요청이 1회 추가된다.** 인접 영업일 엔드포인트가 없어(D-05) ±90일 범위를 조회해 실존 이웃을 계산하기 때문이다. 404·에러 화면도 같은 쿼리를 쓴다.
7. **90일보다 먼 이웃 스냅샷은 "없음"으로 표시된다.** 위 우회의 한계다.
8. **`FetchErrorPresentation.code`가 `string | null`이 됐고**, `StatusCard`는 `badge`가 null이면 배지 요소를 아예 렌더링하지 않는다.
9. **배치 운영에서 필터·페이지를 바꾸면 URL의 `jobId`가 제거된다.** 필터 변경 후에도 이전 선택을 유지하던 동작에 의존하는 북마크·자동화는 영향을 받는다. `?jobId=&view=detail` 딥링크 자체는 그대로 동작한다.
10. **`MarketIndexTable`, `MarketSection`, `ArchiveResultsTable`, `ArchiveResultsCard`가 `canViewOps` prop을 필수로 받는다.** 외부에서 직접 렌더링하던 코드는 수정이 필요하다.
11. **`ArchiveModeBand`의 `prevDate`/`nextDate`가 nullable이 되고 `nextDisabled` prop이 사라졌다.**
12. **카드 헤딩 크기가 14 / 14.5 / 15px 혼재에서 `--text-card-heading`(17px) 하나로 통일됐다.** `docs/ui-improvement-plan.md` §5-3의 "혼재 유지" 결정을 의도적으로 뒤집은 것이다.

---

## 5. 백엔드 지원이 필요한 미완료 항목

전문은 `docs/backend-requests-2026-08-12.md`에 있다. 프런트에서 추측 구현하지 않고 남긴 항목이다.

| # | 항목 | 막힌 요구 |
|---|---|---|
| B-1 | 페이지 레벨 `keyPoints[]` | §4.1 `오늘의 핵심` 3개 항목. `globalHeadline` 문자열 하나뿐이고 `analysis`는 시장 단위라, 미국과 한국의 방향이 엇갈릴 때 한 문장으로 합치면 사실을 왜곡한다 |
| B-2 | 클러스터 분석 구조화 + 근거 매핑 | §4.4 전체. `summary`는 `{short, long, analysis[]}`뿐이라 어느 문단이 "발생 배경"이고 어느 문단이 "시장 영향"인지 구분할 근거가 없다 |
| B-3 | 아카이브 `q`·`marketType`·`theme` 파라미터 | §7 키워드·시장·테마 필터. 서버 페이지네이션이라 클라이언트 필터링은 총건수·정렬을 어긋나게 만든다 |
| B-4 | 기사 `duplicateGroupId` | §4.5 중복·유사 기사 묶음. 제목 문자열 비교로 판정하면 서로 다른 기사를 합친다 |
| B-5 | 인접 영업일 (기존 D-05) | §9.1. ±90일 조회로 우회 구현했고 그 비용은 위 §4-6, §4-7에 적었다 |

**§8.3 배치 수동 실행은 범위에서 제외했다.** 대상 모달이 이 작업 착수 4커밋 전(`a23b319`~`b3e759a`)에 의도적으로 제거되어 고칠 UI가 없다.

§4.4는 대신 가독성 계층화(핵심 요약 / AI 심층 분석 / 근거 기사, 글자 크기 통일, 생성 기준 시각, 근거 기사 앵커)까지 수행했다.

---

## 6. 테스트 결과

2026-08-12 HEAD `b67f285`에서 실제 실행한 출력이다.

| 명령 | 착수 전 | 완료 후 |
|---|---|---|
| `pnpm lint` | 0 warnings | **0 warnings** (207 files) |
| `pnpm build` | 성공 | **성공** (`tsc -b && vite build`) |
| `pnpm test` | 374 passed / 47 files | **455 passed / 59 files** |
| `pnpm e2e` | 141 passed / 8 files | **157 passed / 8 files** |
| `pnpm contrast` | (없음) | **PASS** (라이트·다크 전 조합 AA) |
| `pnpm knip` | `Direction` 1건 | **`Direction` 1건** (신규 미사용 export 0) |

작업 전체를 통틀어 **삭제·비활성화·약화된 테스트는 없다.** 동작 변경으로 깨진 테스트는 새 인터랙션에 맞게 다시 작성했다.

---

## 7. 전후 비교 스크린샷

**캡처하지 못했다.** 정직하게 사유를 적는다.

- `e2e/capture-screenshots.spec.ts`는 **저장소에 존재하지 않는다.** 착수 전 계획 문서(`docs/ui-improvement-plan.md`)가 이 스펙과 18장 캡처를 전제로 쓰여 있으나, 그 문서는 2026-08-07 기준이고 현재 `e2e/`에 남은 스펙은 `a11y` · `archive-search` · `batch-ops` · `batch-summary-responsive` · `permissions` · `responsive-overflow` · `routing` 7종뿐이다.
- `.gitignore`에도 PNG·스크린샷 관련 항목이 없다. 즉 "PNG는 커밋되지 않는다"는 옛 문서의 전제 역시 현재 저장소에는 해당하지 않는다.
- 착수 전(`094bb43`) 상태의 "이전" 이미지를 만들려면 기준 커밋을 체크아웃해 다시 빌드·캡처해야 하는데, 그 과정에서 작업 트리를 되돌리게 되므로 수행하지 않았다.

**필요하다면 이렇게 만들 수 있다.** 캡처 스펙(6개 뷰 × 라이트/다크 × 390/768/1280px)을 먼저 작성하고, `git worktree add`로 `094bb43`을 별도 디렉터리에 체크아웃해 "이전"을 캡처한 뒤 현재 브랜치에서 "이후"를 캡처하면 현재 작업 트리를 건드리지 않고 비교본을 얻을 수 있다. 요청하면 진행하겠다.

다만 아래 항목은 스크린샷 없이도 자동화로 검증되어 있다.

- 390 / 768 / 1280px에서 4개 주요 라우트의 **가로 오버플로 0** (`e2e/responsive-overflow.spec.ts`)
- 390px에서 US(Dow · S&P 500 · NASDAQ)와 KR(KOSPI · KOSDAQ) **대표 지수 전량 노출**
- 라이트·다크 양 테마 대비 (`pnpm contrast`)

---

## 8. 색상 대비 측정 결과

`pnpm contrast` 실제 출력. 기준은 일반 텍스트 4.5:1이다.

### 라이트

| 전경 | on surface | on bg | on surface-2 | 판정 |
|---|---:|---:|---:|---|
| `text` | 15.09 | 14.18 | 13.69 | AA |
| `text-soft` | 6.34 | 5.96 | 5.75 | AA |
| `text-faint` | **5.30** | **4.98** | **4.81** | AA |
| `primary` | 5.30 | 4.98 | 4.81 | AA |
| `up` | **5.97** | **5.61** | **5.41** | AA |
| `down` | 5.59 | 5.25 | 5.07 | AA |
| `warning` | 5.93 | 5.57 | 5.38 | AA |
| `danger` | 5.59 | 5.25 | 5.07 | AA |
| `success` | **5.97** | **5.61** | **5.41** | AA |
| `primary-fg` on `primary` | 5.30 | — | — | AA |
| `primary` on `primary-soft` | 4.68 | — | — | AA |

굵게 표시한 값이 이번에 고친 항목이다. 착수 전 실측은 `text-faint` 3.30~3.63, `up`/`success` 3.91~4.31로 **모두 AA 미달**이었다.

### 다크

실측한 모든 조합이 AA를 통과한다(`primary-fg` on `primary` = 7.11). **요청서가 지적한 "다크 테마 주요 버튼 2.36~2.85:1"은 현재 토큰에서 재현되지 않았다.** 근거가 확인되지 않아 다크 색상은 변경하지 않고, 비색상 상태 표기 요구만 반영했다.

마찬가지로 **"파란색 주요 버튼 명암비 2.36~2.85:1"도 라이트 테마에서 재현되지 않았다** — 착수 전 실측값이 5.30:1이었다. 옛 팔레트에서 측정된 값으로 보인다.

---

## 9. 키보드 및 스크린리더 접근성 검증 결과

### 자동화로 검증된 것

| 항목 | 검증 방식 |
|---|---|
| 스킵 링크 키보드 포커스 → `#main-content` 이동 | `e2e/a11y.spec.ts` |
| 데스크톱 Tab 순서가 주 내비게이션을 순서대로 통과 | `e2e/a11y.spec.ts` |
| 모바일 드로어: 첫 포커스 · Tab 트랩 · Escape 닫기 · 메뉴 버튼으로 포커스 복원 | `e2e/a11y.spec.ts` |
| 드로어가 브라우저 히스토리를 건드리지 않음(Back 가로채지 않음) | `e2e/a11y.spec.ts` |
| **화살표 키만으로 시장 탭 전환** (선택 이동 + 패널 내용 변경) | `e2e/a11y.spec.ts` |
| 탭 ARIA: `role`, `aria-selected`, `aria-controls`(선택된 탭만), roving `tabIndex`, ←/→/Home/End | `market-tabs.test.tsx` |
| 라우트 변경 시 `#page-title` 포커스 이동 / **탭 전환(`?market=`)은 포커스를 뺏지 않음** | `e2e/routing.spec.ts` |
| 등락이 색상만으로 표현되지 않음(`▲`/`▼` + sr-only `상승`/`하락`) | `direction-indicator.test.tsx` |
| 방향을 모를 때 기호·단어를 내보내지 않음 | `direction-indicator.test.tsx` |
| 탭 선택 상태가 색상 외 굵기·인디케이터로도 구분됨 | `market-tabs.test.tsx` |
| 외부 링크 접근성 이름에 기사 제목 포함(`원문`/`네이버 미러` 반복 낭독 방지) | `market-issue-list.test.tsx`, `cluster-articles-list.test.tsx` — **접근성 이름으로 조회** |
| 모든 폼 컨트롤에 연결된 `<label>` | `cluster-articles-list.test.tsx` (`getByLabelText`) |
| 44px 터치 영역 | `button.test.tsx` + 빌드 CSS에서 `min-h-tap`/`size-tap`이 44px로 컴파일됨을 확인 |
| 일반 사용자 화면에 운영자 어휘·영문 오류 코드 없음 / 운영자에게는 유지 | `e2e/permissions.spec.ts` (8개 금지어 × `ready`·`failed`·`emptyMarkets`·`error5xx` 시나리오) |

### 검증하지 않은 것 — 명시

- **실제 스크린리더(VoiceOver / NVDA / JAWS)로 수동 테스트하지 않았다.** 위 항목은 전부 DOM·ARIA 속성·접근성 이름 단위의 자동 검증이며, 실제 보조기술의 낭독 순서·발음·중복 낭독 여부는 확인하지 않았다.
- **키보드 검증은 Playwright(Chromium) 한정이다.** 실제 사용자 키보드 조작, Safari·Firefox의 포커스 동작 차이는 확인하지 않았다.
- `prefers-reduced-motion`은 `base.css`에 기존 kill-switch가 있고 이번 작업에서 건드리지 않았으나, **동작 여부를 이번에 새로 검증하지는 않았다.**
- 터치 영역은 **높이만** 검증했다. 좁은 뷰포트에서의 최소 **너비**는 단언하지 않았다.

---

## 10. 이월된 사소한 지적과 판단 보류 항목

리뷰에서 나왔으나 이번 범위에서 고치지 않은 항목이다. 조용히 버리지 않기 위해 남긴다.

### 판단하여 유지하기로 한 것

- **상세 정보 블록의 `metadata.partialMessage`가 일반 사용자에게 보인다.** 백엔드 자유 텍스트라 운영 용어가 섞일 수 있지만, 요청서 §3.1이 일반 사용자에게 "누락된 데이터 종류"를 보여달라고 명시했고 현재 그 값의 유일한 출처다. 구조화된 대체 필드는 `backend-dependencies.md`의 D-13으로 추적 중이다.
- **403 화면이 "배치 이력과 파이프라인 로그"를 언급한다.** 잠긴 문 앞에서 왜 잠겼는지 듣는 것은 의도된 대상에게 주는 설명이며, 요청서도 403에 명확한 사유 설명을 요구한다. 진단값이 아니라 콘텐츠 범주를 말할 뿐이다.

### 이월된 사소한 지적

- `contrast-audit.mjs`가 파싱 불가 토큰을 만나면 토큰 이름 없는 `TypeError`로 죽는다.
- `contrast-audit.mjs`의 `readTokens`가 `indexOf`로 `:root[data-theme="dark"]`를 찾는데, 같은 문자열이 `forced-colors` 블록에도 있다. 다크 블록이 먼저 오기 때문에 현재만 옳다.
- `NO_VALUE = '-'` 결측 센티널이 `market-index-cards.tsx`/`market-index-table.tsx`에 중복 선언되어 있고, `cluster-detail-page.tsx`/`batch-detail-content.tsx`는 이를 문자열 리터럴로 비교한다. 매퍼의 센티널이 바뀌면 조용히 깨진다.
- `orderIndices`의 `RANK`가 `^DJI`와 `KS11`에 같은 순위를 준다. 지수는 항상 시장 단위로 스코프되므로 무해하지만 순서가 모호하다.
- `IssueRow`가 아무도 넘기지 않는 `className` prop을 선언하고 있다(CSS 기반 모바일 숨김 방식의 잔재).
- 이슈 확장 버튼의 `aria-expanded={false}`는 확장 즉시 버튼이 사라지므로 항상 `false`다.
- `cluster-header.tsx`가 `갱신 {updatedAt}`을 무가드로 렌더링해 `갱신 -`가 나올 수 있다.
- `최신순` 정렬이 미리 포맷된 `'YYYY-MM-DD HH:MM KST'` 표시 문자열을 `localeCompare`한다. `formatKstDateTime`이 고정폭 zero-padding을 유지하는 동안만 시간순으로 옳고, 그 불변식을 지키는 테스트가 없다.
- 금지어 목록의 맨 `로그`는 `로그인`에 부분 일치한다. 401/세션 만료 시나리오를 문구 격리 스펙에 추가하면 오탐이 난다.

### 계획과 달라진 구현

- `directionTextClass`는 계획서가 지정한 `direction-indicator.tsx`가 아니라 `src/components/state/direction-text-class.ts`에 있다. Biome의 `useComponentExportOnlyModules`가 컴포넌트 모듈의 비컴포넌트 export를 금지하기 때문이다. 배럴(`@/components/state`)의 공개 export는 계획대로다.
