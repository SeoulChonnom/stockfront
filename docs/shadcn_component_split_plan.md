# Shadcn/UI Component Split Plan

## Scope

이 문서는 현재 정리된 HTML 디자인 자산을 기준으로, React + Vite 환경에서 `shadcn/ui` 중심 구조로 분리하기 위한 구현 계획이다.

대상 화면:

- `Latest Market`
- `Archive Market`
- `Archive Search`
- `News Cluster Detail`
- `Batch Operations`

기준 자산:

- `./docs/design/light_mode/*/code.html`
- `./docs/design/dark_mode/*/code.html`

현재 코드베이스 상태:

- React 19 + Vite
- shadcn/ui 미설치
- Tailwind 설정 미구성
- 앱 코드는 아직 Vite 기본 샘플 상태

## Pre-Review

`frontend-design` 기준으로 보면 현재 디자인 방향은 "institutional data product + editorial market brief"로 정리하는 것이 적절하다. 즉, 정보 밀도가 높은 금융 화면이지만, 단순 백오피스가 아니라 "핵심 헤드라인과 해석"이 전면에 오는 구조다.

`web-design-guidelines` 최신 규칙 기준으로, 컴포넌트 분리 전에 먼저 염두에 둘 UX/접근성 이슈는 아래와 같다.

### High Priority

- `Archive Search`의 결과 행이 `tr onclick` 기반이다. shadcn 분리 시 각 행 내부에 실제 링크를 두거나, row 전체를 `Link`로 감싸는 접근 가능한 패턴으로 바꿔야 한다.
- 액션 성격 요소 중 일부가 현재 `button`/`a` 의미가 불명확하다. 분리 시 "이동"은 링크, "동작"은 버튼으로 엄격히 분리해야 한다.
- 필터 입력들은 실제 구현 시 `label`, `name`, `autocomplete`, `type`, `inputMode`를 갖춘 form 구조로 재작성해야 한다.
- 라이트/다크가 현재 "색만 바뀐 테마"를 넘어서 일부 간격, border radius, footer 표현까지 달라진다. shadcn로 옮길 때는 하나의 컴포넌트 구조를 기준으로 토큰만 테마 분기해야 유지보수가 가능하다.

### Medium Priority

- `News Cluster Detail`과 `Archive Search`에 중복된 폰트 링크/스타일 선언이 있다. React 이관 시 `app-shell` 또는 전역 theme 레벨로 정리해야 한다.
- `Latest Market`와 `Archive Market`은 거의 동일 구조이므로, 페이지 컴포넌트가 아니라 동일한 `MarketOverviewPage` 조합으로 합치는 것이 맞다.
- 숫자/시간 표시가 하드코딩 포맷이다. 실제 앱 이관 시 `Intl.DateTimeFormat`, `Intl.NumberFormat` 유틸로 치환해야 한다.

### Low Priority

- 일부 hover transition이 `transition-all`에 가깝게 설계돼 있다. React 이관 시 `transition-colors`, `transition-opacity`, `transition-transform`으로 명시 분리하는 것이 안전하다.
- 현재 HTML은 Material Symbols를 사용한다. shadcn 조합에서는 `lucide-react`로 통일하는 편이 구현/번들/일관성 측면에서 유리하다.

## Design Direction For Implementation

shadcn/ui로 옮길 때의 방향은 "차분한 금융 데이터 셸 + 강한 헤드라인 카드 + 밀도 높은 분석 컴포넌트"로 고정한다.

핵심 원칙:

- 라이트/다크는 레이아웃이 아니라 theme token만 달라진다.
- 마켓 페이지와 상세 페이지는 같은 앱 셸 안에서 동작한다.
- shadcn 기본 컴포넌트는 최대한 활용하되, 화면의 성격을 결정하는 블록은 도메인 컴포넌트로 감싼다.
- primitive를 너무 많이 직접 노출하지 않고, 페이지는 domain component 조합으로 읽히게 만든다.

## Target Architecture

분해는 4단계로 한다.

1. Theme layer
2. Shell layer
3. Domain component layer
4. Page composition layer

### 1. Theme Layer

`shadcn/ui` 토큰과 프로젝트 전용 semantic token을 같이 사용한다.

필수 전역 변수:

- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`

금융 도메인용 semantic token 추가:

- `--positive`
- `--positive-foreground`
- `--positive-soft`
- `--negative`
- `--negative-foreground`
- `--negative-soft`
- `--market-surface`
- `--market-surface-elevated`
- `--market-outline-subtle`
- `--data-dim`
- `--hero-glow`

폰트 전략:

- headline: `Manrope`
- body: 초기 이관은 `Inter` 유지 가능
- 추후 개선 시 body font를 더 성격 있는 계열로 교체 검토

### 2. Shell Layer

모든 페이지는 아래 조합을 공유한다.

- `AppShell`
- `AppSidebar`
- `AppTopbar`
- `AppContent`
- `AppFooter`

#### `AppShell`

책임:

- 좌측 사이드바 / 상단 탑바 / 메인 오프셋 구조
- 라이트/다크 공통 spacing
- responsive collapse 규칙

props 초안:

```ts
type AppShellProps = {
  section: 'latest' | 'archive' | 'ops';
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  children: React.ReactNode;
};
```

#### `AppSidebar`

책임:

- 제품 로고
- 1차 네비게이션
- 보조 링크
- 현재 섹션 active 처리

shadcn 기반:

- `Button` 또는 `buttonVariants`
- `Separator`
- `ScrollArea` 선택 가능

#### `AppTopbar`

책임:

- 상단 search
- section-level nav
- theme toggle
- user affordance

shadcn 기반:

- `Input`
- `Button`
- `DropdownMenu` 또는 단순 user chip

### 3. Domain Component Layer

페이지에서 직접 primitive를 조립하지 말고, 아래 domain component를 기준으로 조합한다.

#### Market Overview Domain

- `MarketPageHeader`
- `MarketStatusBadge`
- `GlobalHeadlineHero`
- `IndexSummaryCard`
- `NewsClusterCard`
- `MarketAnalysisSection`
- `MarketSectionHeading`

`Latest Market`와 `Archive Market`은 동일한 컴포넌트 세트를 사용하고, 차이는 데이터와 title copy만 둔다.

예시:

```ts
type MarketOverviewPageProps = {
  mode: 'latest' | 'archive';
  reportDate: string;
  generatedAt: string;
  status: 'ready' | 'partial' | 'failed';
  hero: HeroData;
  indices: IndexSummary[];
  clusters: NewsClusterSummary[];
  analyses: MarketAnalysisBlock[];
};
```

#### Archive Search Domain

- `ArchiveSearchHeader`
- `ArchiveFilterPanel`
- `QuickRangeTabs`
- `StatusSelect`
- `DateRangeField`
- `ArchiveResultsTable`
- `ArchiveResultRow`
- `ArchiveMetaPanel`

shadcn 기반:

- `Card`
- `Tabs`
- `Select`
- `Input`
- `Button`
- `Table`
- `Badge`

주의:

- 결과 이동은 제목 셀 내부 `Link`로 재설계
- 필터 상태는 URL query와 동기화
- `market` query는 사용하지 않음

#### News Cluster Detail Domain

- `ClusterBreadcrumb`
- `ClusterHeroHeader`
- `KeywordTagList`
- `AiAnalysisCard`
- `ArticleTimelineList`
- `ArticleTimelineItem`
- `RepresentativeArticleCard`
- `ClusterMetaCard`
- `ClusterBottomActions`

shadcn 기반:

- `Breadcrumb`
- `Badge`
- `Card`
- `Button`
- `Separator`
- `AspectRatio`

주의:

- 기사 원문 이동은 `a` 링크
- 내부 이동은 router link
- 상세 route는 `/market/cluster/:clusterId` 하나로 고정

#### Ops Admin Domain

- `OpsPageHeader`
- `OpsSummaryStatCard`
- `OpsFilterToolbar`
- `BatchHistoryTable`
- `BatchHistoryRow`
- `BatchStatusBadge`
- `BatchExecutionDetailDrawer` 또는 `Dialog`

shadcn 기반:

- `Card`
- `Button`
- `Select`
- `Table`
- `Badge`
- `Dialog` 또는 `Sheet`

### 4. Page Composition Layer

권장 페이지 구성:

```text
src/
  app/
    providers/
      theme-provider.tsx
    router/
      app-routes.tsx
  components/
    ui/
      ...
    layout/
      app-shell.tsx
      app-sidebar.tsx
      app-topbar.tsx
      app-footer.tsx
    market/
      market-page-header.tsx
      market-status-badge.tsx
      global-headline-hero.tsx
      index-summary-card.tsx
      news-cluster-card.tsx
      market-analysis-section.tsx
    archive/
      archive-filter-panel.tsx
      archive-results-table.tsx
      archive-meta-panel.tsx
    cluster/
      cluster-hero-header.tsx
      ai-analysis-card.tsx
      article-timeline-list.tsx
      representative-article-card.tsx
      cluster-bottom-actions.tsx
    ops/
      ops-summary-stat-card.tsx
      batch-history-table.tsx
      batch-status-badge.tsx
  features/
    market/
      data/
      hooks/
      types.ts
    archive/
      data/
      hooks/
      types.ts
    cluster/
      data/
      hooks/
      types.ts
    ops/
      data/
      hooks/
      types.ts
  pages/
    latest-market-page.tsx
    archive-market-page.tsx
    archive-search-page.tsx
    news-cluster-detail-page.tsx
    batch-operations-page.tsx
```

## Shadcn/UI Mapping

직접 매핑은 아래처럼 가져가는 것이 가장 안전하다.

### Base Shadcn Components To Install First

- `button`
- `input`
- `card`
- `badge`
- `table`
- `select`
- `tabs`
- `separator`
- `breadcrumb`
- `dropdown-menu`
- `sheet`
- `dialog`
- `skeleton`

### Components That Should Stay Custom

- `AppShell`
- `GlobalHeadlineHero`
- `IndexSummaryCard`
- `NewsClusterCard`
- `ArchiveFilterPanel`
- `ArchiveMetaPanel`
- `RepresentativeArticleCard`
- `OpsSummaryStatCard`

이유:

- 이 블록들은 단순 primitive 조합을 넘어 화면의 identity를 만든다.
- shadcn primitive 위에 thin wrapper가 아니라, 명확한 domain component여야 재사용성이 생긴다.

## Suggested Type System

```ts
type AppSection = 'latest' | 'archive' | 'ops';

type Status = 'ready' | 'partial' | 'failed';

type Tone = 'positive' | 'negative' | 'neutral';

type IndexSummary = {
  name: string;
  value: number;
  change: number;
  changeRate: number;
  high: number;
  low: number;
  tone: Tone;
};

type NewsClusterSummary = {
  id: string;
  title: string;
  articleCount: number;
  summary: string;
  tags: string[];
};

type ArchiveRecord = {
  id: string;
  market: 'us' | 'kr';
  businessDate: string;
  headline: string;
  status: Status;
  generatedAt: string;
};

type ArticleLink = {
  id: string;
  publisher: string;
  publishedAt: string;
  title: string;
  originalUrl: string;
  mirrorUrl?: string;
};
```

## URL And State Strategy

확정된 라우팅 기준은 아래와 같다.

- `/market/latest`
- `/market/archive/:businessDate`
- `/market/archive/search`
- `/market/cluster/:clusterId`
- `/ops/batches`

파라미터 규칙:

- `businessDate`: `YYYY-MM-DD`
- `clusterId`: `UUID`

### Archive Search Query

- `from`: optional, 기본값은 오늘, 형식은 `YYYY-MM-DD`
- `to`: optional, 기본값은 14일 전, 형식은 `YYYY-MM-DD`
- `status`: optional
- `page`: optional, 기본값은 `1`

예시:

- `/market/archive/search`
- `/market/archive/search?from=2026-03-20&to=2026-03-06`
- `/market/archive/search?from=2026-03-20&to=2026-03-06&status=ready&page=2`

### Batch Operations Query

- `status`: optional
- `from`: optional, 기본값은 오늘, 형식은 `YYYY-MM-DD`
- `to`: optional, 기본값은 14일 전, 형식은 `YYYY-MM-DD`
- `page`: optional, 기본값은 `1`

예시:

- `/ops/batches`
- `/ops/batches?status=failed`
- `/ops/batches?from=2026-03-20&to=2026-03-06&page=3`

### Market Page Query

시장 페이지는 한 페이지 안에서 처리하므로 별도 query 분기를 두지 않는다.

## Migration Order

### Phase 1. Foundation

- Tailwind + shadcn/ui 설치
- `components.json` 생성
- theme token 정리
- light/dark CSS variable 정의
- `cn`, formatter, icon policy 확정

### Phase 2. Shell

- `AppShell`, `AppSidebar`, `AppTopbar`, `AppFooter` 구현
- 현재 5개 페이지를 전부 같은 shell로 감쌀 수 있게 구성

### Phase 3. Market Pair

- `Latest Market`, `Archive Market`을 먼저 구현
- `MarketOverviewPage` 한 세트로 묶고 copy만 분기
- 이 단계에서 `IndexSummaryCard`, `NewsClusterCard`, `MarketAnalysisSection` 고정

### Phase 4. Archive Search

- 검색/필터 상태를 form + query state로 구현
- `ArchiveResultsTable` 접근성 정리
- empty/loading/error 상태 추가

### Phase 5. Cluster Detail

- `ArticleTimelineList`, `RepresentativeArticleCard` 구현
- 외부 링크/내부 링크 역할 분리
- sticky aside 반응형 처리

### Phase 6. Ops Admin

- 통계 카드 + 배치 이력 테이블 구현
- 상세 drawer 또는 dialog 패턴 확정

## Risks And Ambiguities

이전 계획에서 모호했던 부분은 대부분 확정되었다. 남아 있는 리스크는 구현 난이도나 데이터 구조에 가깝다.

### 1. Theme Parity

라이트/다크는 완전히 동일한 component tree를 사용한다.

고정 원칙:

- 구조 동일
- spacing 동일
- radius 동일
- 상태 표현 동일
- 색, 그림자, border contrast만 theme token으로 분기

### 2. Icon Strategy

아이콘은 `lucide-react`로 통일한다.

적용 원칙:

- navigation, status, filter, breadcrumb, action icon 모두 `lucide-react` 사용
- 기존 Material Symbols 이름은 migration map으로 대응
- 정말 대응 아이콘이 부정확한 경우에만 예외 슬롯 검토

### 3. Navigation Semantics

현재 HTML은 페이지 이동과 액션이 혼재되어 있으므로 React 이관 시 아래처럼 고정한다.

- 페이지 이동: `Link`
- 동작 실행: `Button`
- 외부 기사: `a target="_blank" rel="noreferrer"`
- `Archive Search` 결과는 제목 셀 텍스트에만 `Link` 부여

### 4. Data Source Granularity

`Latest/Archive Market`은 초기 구현에서 page-level DTO를 사용한다.

권장:

- 초기 구현은 page-level DTO
- 안정화 후 cluster, indices, analysis를 분리 fetch 검토

## Recommended First Implementation Slice

첫 구현 범위는 아래가 가장 효율적이다.

1. `AppShell`
2. `MarketStatusBadge`
3. `MarketPageHeader`
4. `GlobalHeadlineHero`
5. `IndexSummaryCard`
6. `NewsClusterCard`
7. `Latest Market` 페이지
8. `Archive Market` 페이지

이 순서가 좋은 이유:

- 가장 반복률이 높다.
- UI 기준점이 된다.
- 이후 `Archive Search`, `News Cluster Detail`, `Ops Admin`이 이 foundation 위에 얹힌다.

## Confirmed Decisions

아래 항목은 확정되었고 이후 구현 기준으로 고정한다.

1. 라우팅은 `/market/latest`, `/market/archive/:businessDate`, `/market/archive/search`, `/market/cluster/:clusterId`, `/ops/batches`를 사용한다.
2. 아이콘은 `lucide-react`로 통일한다.
3. 라이트/다크는 완전히 동일한 component tree를 사용한다.
4. `Archive Search` 결과 이동은 제목 셀 내부 링크 방식으로 구현한다.

## Updated Recommendation

확정된 조건을 반영하면 기존 계획은 여전히 타당하고, 오히려 구현 우선순위가 더 명확해진다.

1. Tailwind + shadcn/ui 설치와 theme token 정리
2. `lucide-react` 기반 `AppShell` 구현
3. `Latest Market`와 `Archive Market`을 단일 page composition으로 구현
4. `Archive Search`를 query-state 기반 페이지로 구현
5. `News Cluster Detail`을 `clusterId` 기반 detail page로 구현
6. `Batch Operations`를 query-state + table page로 구현

추가 확인이 필요한 설계 쟁점은 현재 기준으로 크지 않다. 다음 단계는 실제 shadcn/ui 도입과 foundation 구현으로 넘어가면 된다.
