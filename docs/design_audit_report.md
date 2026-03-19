# 디자인 HTML 감사 보고서

작성일: 2026-03-19  
검토 범위: `docs/design/light_mode/*/code.html`, `docs/design/dark_mode/*/code.html`  
검토 기준:

- `frontend-design` 스킬의 미학 기준
- `web-design-guidelines` 스킬이 요구하는 최신 Vercel Web Interface Guidelines
- 라이트/다크 모드 간 일관성
- shadcn/ui 기반 구현 가능성

가이드라인 원문:

- https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

PNG 파일은 기본적으로 분석 대상에서 제외했다. HTML 구조만으로 충분히 판단 가능한 항목이 많았고, 별도 시각 확인이 꼭 필요한 수준의 구조적 불일치는 코드만으로도 식별 가능했다.

## 1. 종합 평가

### 총평

현재 산출물은 "시안"으로서는 충분히 볼 만하지만, "구현 기준 문서" 또는 "실서비스 직전 HTML"로 보기에는 품질 편차가 크다. 특히 다음 네 가지가 핵심 문제다.

1. 라이트/다크 모드가 단순 테마 전환이 아니라 페이지 구조와 IA까지 달라진다.
2. 접근성과 시맨틱 마크업 품질이 전반적으로 낮다.
3. 동일한 디자인 시스템이 아니라 페이지별로 별도 스타일 실험이 섞여 있다.
4. shadcn/ui로 옮기는 것은 가능하지만, 현재 HTML을 그대로 컴포넌트화하면 일관성 부재가 그대로 복제된다.

### 한 줄 결론

- 시각적 완성도: 중상
- 제품 일관성: 중하
- 접근성/웹 가이드라인 준수: 하
- shadcn/ui 구현 가능성: 높음
- 그대로 구현 권장 여부: 낮음

## 2. 핵심 결론

### 좋은 점

- 정보 구조 자체는 대부분 명확하다. KPI, 카드, 테이블, 타임라인, 상세 카드, 필터 영역으로 나뉘는 방식은 실무 UI로 옮기기 쉽다.
- 금융/운영 도메인에 맞는 카드형 레이아웃, 숫자 강조, 상태 배지 사용은 적절하다.
- `Manrope` + `Inter` 조합은 안전하고 구현 난이도도 낮다.
- 다크 모드 버전 중 일부는 라이트 모드보다 밀도, 대비, 앱 셸 구조가 더 안정적이다.

### 큰 문제

- 다크 모드가 단순한 색상 반전이 아니라 사이드바, 상단바, 계정 영역, 검색 영역, 타이틀 텍스트까지 별도 디자인으로 분기된다.
- 여러 페이지에서 문서 `<title>` 자체가 없거나 잘못되었다.
- 아이콘만 있는 버튼, 클릭 가능한 `span`, 클릭 가능한 `div`, `onclick`이 달린 테이블 행 등 기본 웹 접근성 원칙 위반이 반복된다.
- 폼 요소에 `label`은 있지만 `for`, `id`, `name`, `autocomplete`, `aria-label` 연결이 빠져 있다.
- `transition-all` 사용이 잦고 `prefers-reduced-motion` 대응이 없다.
- 일부 페이지는 중복 폰트 로드, 숨겨진 죽은 사이드바, 모드별 명칭 불일치 등 유지보수성이 떨어진다.

## 3. 공통 이슈

### 3.1 라이트/다크 모드 불일치

요청사항상 동일 폴더 구조의 라이트/다크는 "모드만 바뀐 버전"이어야 한다. 하지만 실제로는 다음 수준으로 달라진다.

- 상단 내비게이션 구조 변경
- 사이드바 유무 변경
- 계정 영역 UI 변경
- 검색창 유무 변경
- 브랜드명 표기 변경
- 섹션 간 간격과 모서리 반경 변경
- 일부 페이지 제목 문자열 변경

이건 테마 문제가 아니라 별도 레이아웃 분기다. 구현 단계에서 그대로 가져가면 QA 범위가 2배로 커지고, shadcn 컴포넌트 재사용성도 크게 떨어진다.

### 3.2 메타데이터/문서 헤드 품질 부족

- `archive_search_page`, `news_cluster_detail_page` 라이트/다크 모두 `<title>`이 없다.
- `archive_market_page` 라이트 모드는 Archive 페이지인데 title이 `Latest Market`이다.
- `batch_operations_status_page`는 라이트/다크 간 title 문자열이 다르다.
- `theme-color`, `color-scheme` 메타가 없다.

증거:

- [`archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L1)
- [`news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L1)
- [`archive_market_page/code.html`](./docs/design/light_mode/archive_market_page/code.html#L4)
- [`batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L6)
- [`batch_operations_status_page/code.html`](./docs/design/dark_mode/batch_operations_status_page/code.html#L6)

### 3.3 접근성/시맨틱 공통 문제

- 아이콘 버튼에 `aria-label`이 없다.
- 클릭 가능한 `span`과 `div`가 많다.
- 테이블 링크를 실제 `<a>`가 아니라 아이콘 `span`으로 처리했다.
- 폼 라벨이 시각적으로만 존재하고 폼 컨트롤과 프로그램적으로 연결되지 않았다.
- 클릭 가능한 테이블 행에 `onclick`을 사용했다.

대표 증거:

- [`latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html#L93)
- [`latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html#L431)
- [`archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L150)
- [`archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L196)
- [`batch_operations_status_page/code.html`](./docs/design/dark_mode/batch_operations_status_page/code.html#L66)

### 3.4 스타일 시스템 일관성 부족

- 라이트 모드는 머티리얼 3 계열 토큰, 다크 모드는 Slate 중심 별도 토큰으로 갈라진다.
- 일부 페이지는 `rounded-xl`, 일부는 `rounded`, 일부는 4/8/12px 체계다.
- 같은 도메인 제품인데 페이지별로 "마케팅형", "대시보드형", "어드민형" 밀도가 달라 브랜드 인상이 흔들린다.

이 상태에서 shadcn/ui로 옮기면 "컴포넌트는 공통인데 화면은 제각각"인 상황이 생긴다.

### 3.5 프런트엔드 미학 기준 관점

`frontend-design` 기준으로 보면 현재 디자인은 안전하고 구현 가능한 범위에 머물러 있다. 문제는 "못생겼다"보다 "캐릭터가 약하다" 쪽이다.

- 색상 사용은 무난하지만 기억에 남는 포인트가 약하다.
- `Manrope + Inter` 조합은 실용적이지만 모든 페이지에 동일하게 적용되며 개성은 적다.
- 모션은 대부분 `transition-colors`, `transition-all` 수준으로 얕다.
- 금융 서비스로서 신뢰감은 있으나, 제품 정체성을 만드는 강한 디테일은 부족하다.

즉, 디자인 방향은 "무난한 SaaS UI"에 가깝고, 고급스러운 제품 언어로 정제되기 전 단계다.

## 4. 페이지별 분석

## 4.1 Latest Market Page

대상:

- [`light_mode/latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html)
- [`dark_mode/latest_market_page/code.html`](./docs/design/dark_mode/latest_market_page/code.html)

### 장점

- KPI 카드, 섹션 헤더, 기사 테이블, 메타 통계 카드로 이어지는 정보 구조는 좋다.
- 숫자 데이터에 `tabular-nums`를 쓰는 점은 금융 페이지에 적합하다.
- 주요 행동 버튼과 상태 배지가 잘 보인다.

### 문제점

- 라이트 모드는 상단 헤더 중심 구조인데, 다크 모드는 완전한 앱 셸 구조로 바뀐다.
- 라이트 모드의 알림/계정/사이드 레일 아이콘이 모두 `span + cursor-pointer`다.
- 기사 링크가 실제 링크가 아니라 클릭 가능한 아이콘 `span`이다.
- `transition-all`이 카드 전반에 반복되어 가이드라인에 맞지 않는다.

증거:

- [`light_mode/latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html#L93)
- [`light_mode/latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html#L431)
- [`light_mode/latest_market_page/code.html`](./docs/design/light_mode/latest_market_page/code.html#L490)
- [`dark_mode/latest_market_page/code.html`](./docs/design/dark_mode/latest_market_page/code.html#L108)
- [`dark_mode/latest_market_page/code.html`](./docs/design/dark_mode/latest_market_page/code.html#L446)

### 모드 차이 평가

- 수정 필요. 단순 색상 모드가 아니라 레이아웃 변형이다.
- 다크 모드가 더 완성도 높은 앱 셸을 가지지만, 라이트와 동일 제품으로 보이지 않는다.

### shadcn 구현성

- 구현 가능성: 매우 높음
- 기본 매핑:
  - `Card`, `Badge`, `Table`, `Button`, `Separator`, `ScrollArea`
- 커스텀 필요:
  - 대시보드 카드 variant
  - 기사 링크 아이콘 셀
  - 좌측 미니 레일 또는 표준 `Sidebar`

### 권고

- 이 페이지는 다크 모드의 앱 셸 방향을 기준으로 라이트/다크를 재정렬하는 편이 낫다.
- 모든 아이콘 액션을 `Button` 또는 `Link`로 치환해야 한다.

## 4.2 Archive Market Page

대상:

- [`light_mode/archive_market_page/code.html`](./docs/design/light_mode/archive_market_page/code.html)
- [`dark_mode/archive_market_page/code.html`](./docs/design/dark_mode/archive_market_page/code.html)

### 장점

- 상세한 과거 일자 마켓 브리프 화면으로서 Latest Market과 구조를 공유하는 점은 나쁘지 않다.
- 날짜 중심 헤더는 Archive 문맥과 맞는다.

### 문제점

- 라이트 모드 title이 잘못되었다.
- 라이트 모드는 사실상 Latest Market의 변주판이고, 다크 모드는 별도 설계다.
- 다크 모드에서는 브랜드 명칭이 `Market Brief`, 라이트 모드는 `Market Daily Brief`로 갈린다.
- 상단 검색창, 도움말 영역, 계정 영역 구성이 모드마다 다르다.

증거:

- [`light_mode/archive_market_page/code.html`](./docs/design/light_mode/archive_market_page/code.html#L4)
- [`dark_mode/archive_market_page/code.html`](./docs/design/dark_mode/archive_market_page/code.html#L6)
- [`dark_mode/archive_market_page/code.html`](./docs/design/dark_mode/archive_market_page/code.html#L98)

### 모드 차이 평가

- 수정 필요. 같은 화면의 테마 버전이 아니라 거의 다른 페이지다.

### shadcn 구현성

- 구현 가능성: 매우 높음
- 다만 Latest Market과 Archive Market을 별개 페이지로 구현하되, 공통 `DashboardShell`, `MarketSummaryCard`, `IssueClusterCard`, `ArticleTable`을 뽑는 구조가 필요하다.

### 권고

- Latest Market과 Archive Market의 공통 프레임을 먼저 확정하고, 날짜/데이터만 다르게 두는 방식으로 재정리해야 한다.

## 4.3 Archive Search Page

대상:

- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html)
- [`dark_mode/archive_search_page/code.html`](./docs/design/dark_mode/archive_search_page/code.html)

### 장점

- 필터 바와 결과 테이블 조합은 기능 목적에 잘 맞는다.
- 검색 결과 상태 배지와 날짜 컬럼 구성이 읽기 쉽다.
- 다크 모드의 밀도는 어드민 도구에 적합하다.

### 문제점

- 라이트/다크 모두 문서 `<title>`이 없다.
- 라이트 모드는 Material Symbols 링크가 중복 로드된다.
- 라벨은 존재하지만 `for`/`id` 연결이 없다.
- `select`, `input[type=date]`에 `name`, `autocomplete`, `aria-label`이 없다.
- 첫 번째 행은 `onclick`으로 이동하고, 나머지 행은 시각적으로 클릭 가능하지만 실제 동작 정의가 없다.
- 페이지네이션 버튼은 의미는 있으나 현재/다음/이전의 보조 정보가 없다.

증거:

- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L1)
- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L8)
- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L150)
- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L170)
- [`light_mode/archive_search_page/code.html`](./docs/design/light_mode/archive_search_page/code.html#L196)

### 모드 차이 평가

- 수정 필요. 다크 모드는 앱 셸을 가진 어드민형 화면이고, 라이트 모드는 비교적 단순한 컨테이너형 화면이다.

### shadcn 구현성

- 구현 가능성: 매우 높음
- 기본 매핑:
  - `Input`, `Select`, `Button`, `Table`, `Pagination`, `Badge`
- 커스텀 필요:
  - Date range 컴포넌트
  - 결과 행 클릭 대신 셀 내부 링크 구조

### 권고

- 검색 결과 클릭은 `<a>` 또는 `Link` 기반으로 재구성해야 한다.
- shadcn `Table` 위에 row-action 패턴을 얹는 쪽이 가장 안전하다.

## 4.4 News Cluster Detail Page

대상:

- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html)
- [`dark_mode/news_cluster_detail_page/code.html`](./docs/design/dark_mode/news_cluster_detail_page/code.html)

### 장점

- 콘텐츠 밀도와 읽기 흐름이 좋다.
- 좌측 분석 리포트 + 우측 대표 기사 카드 조합은 설득력 있다.
- 기사 타임라인은 에디토리얼한 느낌이 나서 현재 파일들 중 가장 차별화된 편이다.

### 문제점

- 라이트/다크 모두 문서 `<title>`이 없다.
- 라이트 모드는 Material Symbols 링크가 중복 로드된다.
- 상단 알림/계정 버튼에 `aria-label`이 없다.
- 대표 기사 이미지는 `width`, `height`가 없다.
- 하단에 숨겨진 사이드바가 남아 있어 구조적으로 죽은 코드가 존재한다.
- 액션 버튼 대부분이 목적 링크인데 `<button>`으로 작성되었다.

증거:

- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L1)
- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L100)
- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L220)
- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L239)
- [`light_mode/news_cluster_detail_page/code.html`](./docs/design/light_mode/news_cluster_detail_page/code.html#L279)

### 모드 차이 평가

- 수정 필요. 다크 모드는 상단/사이드 앱 셸이 들어가고, 라이트 모드는 본문 중심 단일 화면으로 남아 있다.
- 정보 구조 자체는 비슷하지만 셸 레벨에서 일관성이 깨진다.

### shadcn 구현성

- 구현 가능성: 높음
- 기본 매핑:
  - `Breadcrumb`, `Card`, `Button`, `Badge`, `Separator`
- 커스텀 필요:
  - 기사 타임라인 row
  - 대표 기사 카드
  - sticky aside 레이아웃

### 권고

- 이 페이지는 디자인 잠재력이 가장 높다.
- 다만 "콘텐츠 상세 페이지"로서의 셸을 Latest/Archive와 어떻게 공유할지 먼저 정해야 한다.

## 4.5 Batch Operations Status Page

대상:

- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html)
- [`dark_mode/batch_operations_status_page/code.html`](./docs/design/dark_mode/batch_operations_status_page/code.html)

### 장점

- 전체 페이지 중 shadcn/ui로 가장 옮기기 쉽다.
- KPI 카드, 필터 바, 테이블, 요약 사이드 카드의 패턴이 전형적인 운영 대시보드 구조다.
- 다크 모드 버전은 가장 안정된 어드민 UI에 가깝다.

### 문제점

- 라이트/다크 title이 다르다.
- 라이트 모드는 폰트 링크가 중복 로드된다.
- 알림 버튼에 `aria-label`이 없다.
- `label`과 `select`, `input`이 연결되지 않았다.
- `outline-none` 사용이 있고, 포커스 대체는 일부 있으나 일관된 패턴으로 정리되어 있지 않다.
- 행 우측 액션 버튼은 hover 시에만 드러나 키보드 사용성이 낮다.
- 날짜 범위 필드가 실질적으로는 date picker trigger인데, `readonly text input`으로 표현되어 의미가 약하다.

증거:

- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L6)
- [`dark_mode/batch_operations_status_page/code.html`](./docs/design/dark_mode/batch_operations_status_page/code.html#L6)
- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L101)
- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L196)
- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L198)
- [`light_mode/batch_operations_status_page/code.html`](./docs/design/light_mode/batch_operations_status_page/code.html#L253)

### 모드 차이 평가

- 수정 필요. 페이지의 역할은 같지만, 브랜드명, 검색 영역, 아이콘 표현, 반경 체계가 다르다.
- 다크 모드 쪽이 더 제품화되어 있으므로 그 방향으로 통합하는 편이 좋다.

### shadcn 구현성

- 구현 가능성: 매우 높음
- 기본 매핑:
  - `Card`, `Table`, `Select`, `Input`, `Button`, `Badge`
- 커스텀 필요:
  - KPI 카드 variants
  - Execution timeline cell
  - Row action disclosure

### 권고

- 이 페이지를 shadcn 마이그레이션의 기준 페이지로 삼는 것이 좋다.
- 이유는 패턴이 가장 표준적이고 재사용 컴포넌트를 뽑기 쉽기 때문이다.

## 5. 라이트/다크 모드 일관성 평가

| 페이지              | 일관성 평가 | 비고                                    |
| ------------------- | ----------- | --------------------------------------- |
| Latest Market       | 낮음        | 헤더형 vs 앱 셸형                       |
| Archive Market      | 매우 낮음   | title, 브랜드, 셸, 검색 구조까지 다름   |
| Archive Search      | 낮음        | 같은 기능이지만 다른 제품처럼 보임      |
| News Cluster Detail | 중하        | 본문 구조는 유사, 셸 구조는 다름        |
| Batch Operations    | 중하        | 역할은 동일, 토큰/브랜드/검색 구성 다름 |

### 결론

모드 차이는 "색상, 대비, 배경 질감, 테두리 세기" 정도로 제한해야 한다. 현재처럼 레이아웃과 내비게이션 구조가 달라지면 테마 시스템이 아니라 별도 페이지 유지보수가 된다.

## 6. shadcn/ui 구현 가능성 검토

### 결론

구현 자체는 충분히 가능하다. 기술적 장애물은 거의 없다. 문제는 "무엇을 기준 디자인으로 삼을 것인가"다.

### 그대로 옮기기 쉬운 영역

- 상단/사이드 앱 셸
- 카드 레이아웃
- KPI 배지
- 기본 테이블
- 버튼, 필터, 셀렉트, 입력창
- Breadcrumb, Badge, Separator

### shadcn 기본 컴포넌트로 가능한 것

- `Button`
- `Input`
- `Select`
- `Card`
- `Table`
- `Badge`
- `Breadcrumb`
- `Separator`
- `Sheet` 또는 `Sidebar`
- `Tooltip`
- `DropdownMenu`

### 커스텀 컴포넌트가 필요한 것

- Market summary stat card
- Cluster insight card
- Related article timeline item
- Batch execution status row
- Dashboard shell with sidebar + topbar
- Date range trigger / filter toolbar

### 구현 시 리스크

- 현재 토큰 체계가 페이지별로 달라서 `globals.css` 혹은 디자인 토큰 계층을 먼저 통합해야 한다.
- 외부 CDN Tailwind 스크립트 기준 HTML이라서 실제 앱 코드로 옮길 때 토큰 네이밍 정리가 필요하다.
- 머티리얼 심볼을 그대로 쓸지, `lucide-react`로 바꿀지 결정해야 한다.

### 판단

- shadcn/ui 구현 가능성: 8.5/10
- 현재 HTML을 무수정 참고안으로 쓰기 적합한 정도: 5/10
- 디자인 시스템 재정의 후 구현 기준안으로 쓰기 적합한 정도: 8/10

## 7. 우선순위 수정 권고

### P0

- 모든 페이지의 `<title>` 정정 및 누락 보완
- 라이트/다크 모드 간 정보 구조 통일
- 클릭 가능한 `span`, `div`, `onclick row` 제거
- 아이콘 버튼 `aria-label` 추가
- 폼 `label`과 입력 요소 연결

### P1

- 중복 폰트 로드 제거
- 링크 목적 액션을 `<a>`로 치환
- 테이블 액션 버튼의 hover-only 노출 개선
- `transition-all` 제거 후 명시적 transition 사용
- `theme-color`, `color-scheme` 추가

### P2

- 페이지별 토큰 체계 정리
- 반경, 그림자, 테두리 강도 일관화
- brand naming 통일: `Market Brief` vs `Market Daily Brief`
- 데스크톱/모바일 공통 셸 전략 정리

## 8. 추천 구현 전략

### 권장 기준안

다크 모드 버전들 중 앱 셸이 정리된 방향을 기준으로 잡고, 라이트 모드를 동일 구조로 재작성하는 것이 가장 효율적이다.

### 권장 컴포넌트 분해

- `DashboardShell`
- `TopNav`
- `SidebarNav`
- `MetricCard`
- `StatusBadge`
- `IssueClusterCard`
- `ArticleTable`
- `FilterToolbar`
- `BatchHistoryTable`
- `RepresentativeArticleCard`

### 권장 원칙

- 모드는 레이아웃을 바꾸지 말고 토큰만 바꾼다.
- 데이터 액션은 링크와 버튼의 의미를 엄격히 구분한다.
- shadcn 기본 컴포넌트를 최대한 활용하되, 도메인 카드만 커스텀한다.

## 9. 최종 판단

현재 디자인은 "화면 아이디어"로는 충분히 유의미하다. 특히 Latest Market, News Cluster Detail, Batch Operations는 제품 구조로 발전시킬 만한 기반이 있다. 하지만 지금 상태 그대로 구현 기준으로 삼기에는 다음 문제가 명확하다.

- 접근성 품질이 낮다.
- 모드 일관성이 부족하다.
- 디자인 시스템이 한 벌로 정리되어 있지 않다.
- shadcn 컴포넌트화 전에 기준 패턴을 먼저 정해야 한다.

따라서 권장 방향은 다음과 같다.

1. `Batch Operations`와 다크 모드 앱 셸을 기준으로 공통 레이아웃을 확정한다.
2. `Latest Market`와 `Archive Market`을 공통 컴포넌트 세트로 재정리한다.
3. `Archive Search`, `News Cluster Detail`을 같은 셸 안으로 편입한다.
4. 그 후 shadcn/ui로 컴포넌트 분해를 시작한다.

이 순서로 가면 구현 난이도와 QA 비용을 가장 안정적으로 통제할 수 있다.
