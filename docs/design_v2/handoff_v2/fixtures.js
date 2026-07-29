// Market Brief UI v2 — 상태 등가군 픽스처
// 모든 응답 형태는 stockapp/app/schemas 의 실제 계약을 따른다.
//   DailyPageResponse / ArchiveListResponse / ClusterDetailResponse
//   BatchJobListResponse / BatchJobDetailResponse / BatchRunResponse
// [PROPOSED] 표시는 현재 API에 없는 필드이며 UI에서 backend dependency로 명시한다.

export const NOW_KST = '2026-07-27T08:24:31';
export const TODAY = '2026-07-27';

const pad = (n) => String(n).padStart(2, '0');

export function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));

// ── 지수 ─────────────────────────────────────────────────────────────
const US_INDICES = [
  {
    indexCode: '^GSPC',
    indexName: 'S&P 500',
    closePrice: 5487.03,
    changeValue: 21.43,
    changePercent: 0.39,
    highPrice: 5499.8,
    lowPrice: 5455.22,
  },
  {
    indexCode: '^IXIC',
    indexName: 'NASDAQ',
    closePrice: 17862.23,
    changeValue: 87.51,
    changePercent: 0.49,
    highPrice: 17910.34,
    lowPrice: 17720.03,
  },
  {
    indexCode: '^DJI',
    indexName: 'DOW JONES',
    closePrice: 39308.0,
    changeValue: -23.85,
    changePercent: -0.06,
    highPrice: 39430.1,
    lowPrice: 39180.42,
  },
  {
    indexCode: '^RUT',
    indexName: 'RUSSELL 2000',
    closePrice: 2189.55,
    changeValue: 9.87,
    changePercent: 0.45,
    highPrice: 2196.4,
    lowPrice: 2174.11,
  },
  {
    indexCode: '^VIX',
    indexName: 'VIX',
    closePrice: 13.42,
    changeValue: -0.61,
    changePercent: -4.35,
    highPrice: 14.2,
    lowPrice: 13.28,
  },
];

const KR_INDICES = [
  {
    indexCode: 'KS11',
    indexName: 'KOSPI',
    closePrice: 2765.53,
    changeValue: 18.21,
    changePercent: 0.66,
    highPrice: 2772.11,
    lowPrice: 2742.48,
  },
  {
    indexCode: 'KQ11',
    indexName: 'KOSDAQ',
    closePrice: 812.77,
    changeValue: -2.84,
    changePercent: -0.35,
    highPrice: 819.24,
    lowPrice: 808.9,
  },
  {
    indexCode: 'KRX300',
    indexName: 'KRX 300',
    closePrice: 1684.91,
    changeValue: 6.04,
    changePercent: 0.36,
    highPrice: 1691.2,
    lowPrice: 1672.81,
  },
  {
    indexCode: 'USDKRW',
    indexName: 'USD/KRW',
    closePrice: 1342.5,
    changeValue: -4.2,
    changePercent: -0.31,
    highPrice: 1348.9,
    lowPrice: 1341.2,
  },
];

// ── 기사 ─────────────────────────────────────────────────────────────
const PUBLISHERS = [
  '매일경제',
  '한국경제',
  '연합뉴스',
  '서울경제',
  '조선비즈',
  'Reuters Korea',
  '이데일리',
  '머니투데이',
];

function article(i, seed, opts = {}) {
  const h = 23 - (i % 9);
  return {
    processedArticleId: 2000 + seed * 100 + i,
    title:
      opts.title ??
      `${seed % 2 === 0 ? '반도체' : '외국인'} 수급 개선에 지수 상승 폭 확대 (${i + 1})`,
    publisherName:
      opts.publisherName ?? PUBLISHERS[(seed + i) % PUBLISHERS.length],
    publishedAt: `2026-07-26T${pad(h)}:${pad((i * 7) % 60)}:00`,
    originLink: `https://example.com/article/${seed}-${i}`,
    naverLink:
      i % 5 === 4 ? null : `https://n.news.naver.com/article/${seed}${i}`,
  };
}

// ── 클러스터 카드 ────────────────────────────────────────────────────
const US_CLUSTERS = [
  {
    clusterId: '51f0d9a0-9fc5-4f15-a4f9-62856f128683',
    title: '연준 위원 발언 이후 장기 금리 반등',
    summary:
      '정책금리 경로에 대한 신중론이 재확인되며 성장주 중심으로 장중 등락이 확대됐습니다.',
    articleCount: 8,
    tags: ['Fed', 'Treasury', 'Big Tech'],
    representativeArticle: {
      title: '연준 위원 "금리 인하 서두를 필요 없다"',
      publisherName: '연합뉴스',
      publishedAt: '2026-07-26T22:41:00',
      originLink: 'https://example.com/article/fed-1',
      naverLink: 'https://n.news.naver.com/article/fed1',
    },
  },
  {
    clusterId: '7a2b41c8-3d5e-4f21-9b0c-1e8d7f6a5b43',
    title: 'AI 인프라 투자 확대가 반도체주 지지',
    summary:
      '클라우드 사업자의 설비투자 계획이 관련 공급망 실적 기대를 높였습니다.',
    articleCount: 6,
    tags: ['AI', 'Semiconductor', 'Capex'],
    representativeArticle: {
      title: '하이퍼스케일러 설비투자 상향, 반도체 공급망 수혜',
      publisherName: 'Reuters Korea',
      publishedAt: '2026-07-26T21:12:00',
      originLink: 'https://example.com/article/ai-1',
      naverLink: null,
    },
  },
  {
    clusterId: '9c4d2e10-8b7a-4c36-a5f1-0d3e9b8c7a62',
    title: '에너지 업종은 유가 조정에 약세',
    summary:
      '공급 우려 완화로 유가가 하락하며 정유·탐사 업종이 지수 대비 부진했습니다.',
    articleCount: 4,
    tags: ['Energy', 'OPEC'],
    representativeArticle: {
      title: 'WTI 3% 하락, 공급 차질 우려 완화',
      publisherName: '서울경제',
      publishedAt: '2026-07-26T20:05:00',
      originLink: 'https://example.com/article/oil-1',
      naverLink: 'https://n.news.naver.com/article/oil1',
    },
  },
  {
    clusterId: '2e6f8a04-1c9b-4d75-8e3a-6f2b1d0c9e58',
    title: '소매 실적 시즌 앞두고 소비 지표 혼조',
    summary:
      '카드 지출 데이터와 오프라인 트래픽이 엇갈리며 소비 관련주 변동성이 커졌습니다.',
    articleCount: 3,
    tags: ['Retail', 'Consumer'],
    representativeArticle: {
      title: '카드 지출 증가율 둔화, 오프라인 트래픽은 개선',
      publisherName: '한국경제',
      publishedAt: '2026-07-26T19:33:00',
      originLink: 'https://example.com/article/retail-1',
      naverLink: 'https://n.news.naver.com/article/retail1',
    },
  },
];

const KR_CLUSTERS = [
  {
    clusterId: 'b3d51e7c-04a8-4f62-9d18-7c5e2a9b6f31',
    title: '반도체 수출 개선 기대에 대형주 강세',
    summary: '메모리 가격 회복과 수출 지표 개선이 외국인 수급을 자극했습니다.',
    articleCount: 9,
    tags: ['반도체', '외국인', '수출'],
    representativeArticle: {
      title: '7월 반도체 수출 증가율 두 자릿수 회복',
      publisherName: '매일경제',
      publishedAt: '2026-07-26T17:20:00',
      originLink: 'https://example.com/article/semi-1',
      naverLink: 'https://n.news.naver.com/article/semi1',
    },
  },
  {
    clusterId: 'd8f0a2c6-5b13-4e79-8a4f-2c9d1e6b3a75',
    title: '원화 강세와 외국인 현물 순매수 확대',
    summary:
      '환율 안정이 외국인 위험 선호 회복과 대형주 수급 개선으로 이어졌습니다.',
    articleCount: 7,
    tags: ['환율', '수급', '대형주'],
    representativeArticle: {
      title: '원/달러 1,342원, 외국인 6일 연속 순매수',
      publisherName: '이데일리',
      publishedAt: '2026-07-26T16:48:00',
      originLink: 'https://example.com/article/fx-1',
      naverLink: 'https://n.news.naver.com/article/fx1',
    },
  },
  {
    clusterId: 'f1c93b5e-7a26-4d80-b3e5-9a1f8c2d4067',
    title: '이차전지 업종 종목별 차별화',
    summary: '수주 잔고와 증설 일정에 따라 셀·소재 업종의 방향이 엇갈렸습니다.',
    articleCount: 5,
    tags: ['이차전지', '전기차'],
    representativeArticle: {
      title: '셀 3사 수주 잔고 격차 확대',
      publisherName: '조선비즈',
      publishedAt: '2026-07-26T15:26:00',
      originLink: 'https://example.com/article/batt-1',
      naverLink: null,
    },
  },
  {
    clusterId: '4a7e0d92-6f18-4b53-9c27-8e5d3a1b0f64',
    title: '코스닥 중소형주 차익 실현',
    summary:
      '단기 급등 종목 중심으로 개인 매도가 늘며 코스닥이 약세로 마감했습니다.',
    articleCount: 3,
    tags: ['코스닥', '수급'],
    representativeArticle: {
      title: '코스닥 개인 순매도 전환, 중소형주 조정',
      publisherName: '머니투데이',
      publishedAt: '2026-07-26T15:41:00',
      originLink: 'https://example.com/article/kq-1',
      naverLink: 'https://n.news.naver.com/article/kq1',
    },
  },
];

function articleLinks(clusters, seed) {
  const out = [];
  clusters.forEach((c, ci) => {
    const n = Math.min(3, c.articleCount);
    rep(n, (i) => {
      out.push({
        ...article(i, seed + ci, {
          title: i === 0 ? c.representativeArticle.title : undefined,
        }),
        clusterId: c.clusterId,
        clusterTitle: c.title,
      });
    });
  });
  return out;
}

const US_ANALYSIS = {
  background: [
    '대형 기술주 실적 기대가 지수 상단을 지지',
    '장기 금리 반등으로 장중 변동성 확대',
    '에너지·금융은 경기 지표를 소화하며 혼조',
  ],
  keyThemes: ['금리', 'AI 설비투자', '실적 시즌'],
  outlook:
    '다음 거래일에는 PCE 물가와 대형 기술주 실적이 방향을 결정할 변수다.',
};

const KR_ANALYSIS = {
  background: [
    '반도체 업황 회복 기대와 외국인 순매수 유입',
    '원화 강세가 수급에 우호적으로 작용',
    '이차전지는 종목별 차별화가 이어짐',
  ],
  keyThemes: ['반도체', '외국인 수급', '환율'],
  outlook: '수출 지표 발표와 미국 금리 흐름이 대형주 수급의 변수로 남아 있다.',
};

function market(type, opts = {}) {
  const isUs = type === 'US';
  const clusters = opts.clusters ?? (isUs ? US_CLUSTERS : KR_CLUSTERS);
  const indices = opts.indices ?? (isUs ? US_INDICES : KR_INDICES);
  return {
    marketType: type,
    marketLabel: isUs ? '미국 증시' : '한국 증시',
    summaryTitle:
      opts.summaryTitle ??
      (isUs
        ? '빅테크 실적 기대와 금리 경계가 교차'
        : '반도체 수급 개선과 외국인 매수세 유입'),
    summaryBody:
      opts.summaryBody ??
      (isUs
        ? '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했지만, 장기 금리 반등으로 장중 변동성이 확대되었습니다. 에너지와 금융 업종은 경기 지표를 소화하며 혼조세를 보였습니다.'
        : '한국 시장은 반도체 업황 회복 기대와 외국인 순매수에 힘입어 상승했습니다. 원화 강세가 수급에 우호적으로 작용했으나 이차전지 업종은 종목별 차별화가 이어졌습니다.'),
    analysis: opts.analysis ?? (isUs ? US_ANALYSIS : KR_ANALYSIS),
    indices,
    topClusters: clusters,
    articleLinks: opts.articleLinks ?? articleLinks(clusters, isUs ? 1 : 5),
    metadata: {
      rawNewsCount: opts.rawNewsCount ?? (isUs ? 85 : 89),
      processedNewsCount: opts.processedNewsCount ?? (isUs ? 26 : 28),
      clusterCount: opts.clusterCount ?? clusters.length,
      lastUpdatedAt: '2026-07-27T06:12:10',
      partialMessage: opts.partialMessage ?? null,
    },
  };
}

const LONG_TOKEN =
  'GLOBALMARKETDAILYBRIEFSEMICONDUCTORSUPPLYCHAINRECOVERYANDFOREIGNNETBUYINGANALYSISREPORTVERSIONTHREEFINALDRAFTCONFIDENTIALINTERNALUSEONLYDONOTDISTRIBUTEOUTSIDEOFTHEORGANIZATION2026072712345678';
const LONG_URL =
  'https://research.example.com/reports/2026/07/global-market-daily-brief-semiconductor-supply-chain-recovery-and-foreign-net-buying-analysis-v3-final-confidential.pdf';

function basePage(overrides = {}) {
  return {
    pageId: 501,
    businessDate: '2026-07-26',
    versionNo: 3,
    pageTitle: '글로벌 시장 일간 요약 - 2026-07-26',
    status: 'READY',
    globalHeadline:
      '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목',
    generatedAt: '2026-07-27T06:12:10',
    partialMessage: null,
    markets: [market('US'), market('KR')],
    metadata: {
      rawNewsCount: 174,
      processedNewsCount: 114,
      clusterCount: 21,
      lastUpdatedAt: '2026-07-27T06:12:10',
      isLatest: true,
    },
    ...overrides,
  };
}

// ── 일간 페이지 등가군 ────────────────────────────────────────────────
export function pageFixture(mode, businessDate) {
  const date = businessDate ?? '2026-07-26';
  const withDate = (p) => ({
    ...p,
    businessDate: date,
    pageTitle: `글로벌 시장 일간 요약 - ${date}`,
    metadata: { ...p.metadata, isLatest: date === '2026-07-26' },
  });

  if (mode === 'partial') {
    return withDate(
      basePage({
        status: 'PARTIAL',
        partialMessage:
          '한국 증시 지수 2종과 미국 클러스터 요약 1건이 누락된 상태로 생성됐습니다.',
        markets: [
          market('US', {
            clusters: US_CLUSTERS.slice(0, 3),
            partialMessage:
              'AI 요약 1건이 생성되지 않아 클러스터 3건만 제공됩니다.',
            clusterCount: 3,
          }),
          market('KR', {
            indices: KR_INDICES.slice(0, 2),
            partialMessage:
              'KRX 300, USD/KRW 지수 수집이 provider 타임아웃으로 실패했습니다.',
            rawNewsCount: 41,
            processedNewsCount: 12,
          }),
        ],
        metadata: {
          rawNewsCount: 126,
          processedNewsCount: 74,
          clusterCount: 15,
          lastUpdatedAt: '2026-07-27T06:19:44',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'failed') {
    return withDate(
      basePage({
        status: 'FAILED',
        globalHeadline: null,
        partialMessage:
          '뉴스 수집 단계에서 실패해 이 날짜의 스냅샷이 완성되지 않았습니다.',
        markets: [],
        metadata: {
          rawNewsCount: 21,
          processedNewsCount: 0,
          clusterCount: 0,
          lastUpdatedAt: '2026-07-27T05:31:09',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'emptyMarkets') {
    return withDate(
      basePage({
        markets: [],
        metadata: {
          rawNewsCount: 0,
          processedNewsCount: 0,
          clusterCount: 0,
          lastUpdatedAt: '2026-07-27T06:12:10',
          isLatest: true,
        },
      })
    );
  }

  if (mode === 'sparse') {
    return withDate(
      basePage({
        globalHeadline: null,
        markets: [
          market('US', {
            summaryTitle: null,
            summaryBody: null,
            analysis: { background: [], keyThemes: [], outlook: null },
            indices: [],
            clusters: [],
            articleLinks: [],
            rawNewsCount: 12,
            processedNewsCount: 0,
            clusterCount: 0,
          }),
          market('KR', {
            clusters: KR_CLUSTERS.slice(0, 1),
            indices: KR_INDICES.slice(0, 1),
            articleLinks: [],
          }),
        ],
      })
    );
  }

  if (mode === 'long') {
    return withDate(
      basePage({
        globalHeadline: `금리 경계 속 기술주 강세와 아시아 반도체 수급 개선이 동시에 관측되며 지수 상·하단이 모두 확대된 하루였고 내부 리서치 코드 ${LONG_TOKEN} 로 추적된다`,
        markets: [
          market('US', {
            summaryBody:
              '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했지만 장기 금리 반등으로 장중 변동성이 확대되었습니다. 에너지와 금융 업종은 경기 지표를 소화하며 혼조세를 보였고, 반도체 업종은 AI 서버 수요와 차세대 칩 공개 기대가 동시에 반영되며 지수 대비 초과수익을 기록했습니다. 채권 시장에서는 10년물 금리가 장중 4.42%까지 상승한 뒤 되돌림을 보였으며, 이 과정에서 고밸류 성장주의 할인율 부담이 재차 부각되었습니다. 원문 리포트는 ' +
              LONG_URL +
              ' 에서 확인할 수 있고 내부 추적 코드는 ' +
              LONG_TOKEN +
              ' 입니다.',
            clusters: [
              {
                ...US_CLUSTERS[0],
                title: `연준 위원 발언 이후 장기 금리가 반등하며 성장주 할인율 부담이 재부각된 흐름 정리 (내부코드 ${LONG_TOKEN})`,
              },
              ...US_CLUSTERS.slice(1),
            ],
          }),
          market('KR'),
        ],
      })
    );
  }

  return withDate(basePage());
}

// ── 아카이브 목록 ────────────────────────────────────────────────────
const ARCHIVE_HEADLINES = [
  '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목',
  '유가 하락과 달러 약세가 신흥국 위험 선호를 되살림',
  '실적 시즌 초반 빅테크 가이던스가 지수 방향을 좌우',
  '중국 지표 부진에 아시아 증시 동반 조정',
  '고용 지표 둔화로 금리 인하 기대가 재확산',
  '반도체 재고 조정 마무리 기대에 공급망 전반 강세',
  '지정학 리스크 완화로 방산·에너지 차익 실현',
];

function archiveItem(i) {
  const date = shiftDate('2026-07-26', -i);
  const cycle = i % 11;
  const status = cycle === 3 ? 'PARTIAL' : cycle === 7 ? 'FAILED' : 'READY';
  return {
    pageId: 501 - i,
    businessDate: date,
    pageTitle: `글로벌 시장 일간 요약 - ${date}`,
    headlineSummary:
      status === 'FAILED'
        ? null
        : ARCHIVE_HEADLINES[i % ARCHIVE_HEADLINES.length],
    status,
    generatedAt: `${shiftDate(date, 1)}T06:${pad(8 + (i % 40))}:10`,
    partialMessage:
      status === 'PARTIAL'
        ? '한국 지수 2종 수집 실패로 부분 생성됐습니다.'
        : status === 'FAILED'
          ? '뉴스 수집 단계에서 provider 타임아웃이 발생했습니다.'
          : null,
  };
}

const ARCHIVE_ALL = rep(46, archiveItem);

export function archiveFixture(mode, page, size = 20, status = '') {
  const filtered = status
    ? ARCHIVE_ALL.filter((r) => r.status === status)
    : ARCHIVE_ALL;
  if (mode === 'noResults')
    return { items: [], pagination: { page: 1, size, totalCount: 0 } };
  const start = (page - 1) * size;
  return {
    items: filtered.slice(start, start + size),
    pagination: { page, size, totalCount: filtered.length },
  };
}

// ── 클러스터 상세 ────────────────────────────────────────────────────
const CLUSTER_INDEX = {};
[
  ...US_CLUSTERS.map((c) => ['US', c]),
  ...KR_CLUSTERS.map((c) => ['KR', c]),
].forEach(([mt, c]) => {
  CLUSTER_INDEX[c.clusterId] = { marketType: mt, card: c };
});

export function clusterFixture(mode, clusterId) {
  const hit = CLUSTER_INDEX[clusterId] ?? {
    marketType: 'US',
    card: US_CLUSTERS[0],
  };
  const { card, marketType } = hit;
  const base = {
    clusterId: card.clusterId,
    businessDate: '2026-07-26',
    marketType,
    marketLabel: marketType === 'US' ? '미국 증시' : '한국 증시',
    title: card.title,
    tags: card.tags,
    summary: {
      short: card.summary,
      long: `${card.summary} 관련 기사 ${card.articleCount}건을 종합하면 시장은 단기 변동성보다 방향성 자체를 재확인하는 쪽으로 반응했습니다. 대표 기사와 관련 기사 발행 시각이 장 마감 직후에 집중되어 있어 종가 형성 이후의 해석이 반영된 것으로 보입니다.`,
      analysis: [
        '연방준비제도의 금리 인하 경로가 더 명확해졌다는 해석이 확산되며 고밸류 성장주에 대한 할인율 부담이 완화됐습니다.',
        '엔비디아와 AMD를 포함한 반도체 업종은 AI 서버 수요와 차세대 칩 공개 기대가 동시에 반영되며 지수 대비 초과수익을 기록했습니다.',
        '다만 장기 금리가 재차 상승할 경우 이번 강세의 근거가 약해질 수 있어, 다음 거래일의 물가 지표가 확인 포인트로 남습니다.',
      ],
    },
    articleCount: card.articleCount,
    lastUpdatedAt: '2026-07-27T06:12:10',
    representativeArticle: {
      ...card.representativeArticle,
      processedArticleId: 2001,
      sourceSummary: '경제·금융 전문 매체',
    },
    articles: rep(card.articleCount, (i) =>
      article(i, marketType === 'US' ? 1 : 5)
    ),
  };

  if (mode === 'sparse') {
    return {
      ...base,
      tags: [],
      summary: { short: null, long: null, analysis: [] },
      articleCount: 1,
      representativeArticle: {
        processedArticleId: null,
        title: '제목만 확보된 기사',
        publisherName: null,
        publishedAt: null,
        originLink: 'https://example.com/article/sparse',
        naverLink: null,
        sourceSummary: null,
      },
      articles: [
        {
          processedArticleId: null,
          title: '제목만 확보된 기사',
          publisherName: null,
          publishedAt: null,
          originLink: 'https://example.com/article/sparse',
          naverLink: null,
        },
      ],
    };
  }

  if (mode === 'heavy') {
    return {
      ...base,
      tags: rep(
        20,
        (i) =>
          [
            '반도체',
            'AI',
            '금리',
            '외국인',
            '수출',
            '환율',
            '실적',
            'Fed',
            'Treasury',
            'Capex',
            '메모리',
            'HBM',
            '파운드리',
            '설비투자',
            '가이던스',
            '재고',
            '수급',
            '대형주',
            'ETF',
            '옵션',
          ][i]
      ),
      articleCount: 50,
      articles: rep(50, (i) => article(i, 3)),
    };
  }

  if (mode === 'long') {
    return {
      ...base,
      title: `${card.title} — 내부 추적 코드 ${LONG_TOKEN}`,
      summary: {
        ...base.summary,
        analysis: [
          ...base.summary.analysis,
          `원문 리포트: ${LONG_URL}`,
          LONG_TOKEN,
        ],
      },
    };
  }

  return base;
}

// ── 배치 ─────────────────────────────────────────────────────────────
export const BATCH_STAGES = [
  { key: 'create_job', label: '작업 생성' },
  { key: 'collect_news', label: '뉴스 수집' },
  { key: 'collect_market_indices', label: '지수 수집' },
  { key: 'dedupe_articles', label: '중복 제거' },
  { key: 'build_clusters', label: '클러스터 구성' },
  { key: 'generate_ai_summaries', label: 'AI 요약 생성' },
  { key: 'build_page_snapshot', label: '페이지 스냅샷' },
  { key: 'finalize_job', label: '작업 종료' },
];

function jobStatusFor(i) {
  if (i === 0) return 'RUNNING';
  const c = i % 9;
  if (c === 2) return 'PARTIAL';
  if (c === 5) return 'FAILED';
  return 'SUCCESS';
}

function batchItem(i) {
  const businessDate = shiftDate('2026-07-26', -i);
  const status = jobStatusFor(i);
  const failed = status === 'FAILED';
  const running = status === 'RUNNING';
  const partial = status === 'PARTIAL';
  const startedAt = `${shiftDate(businessDate, 1)}T06:${pad(10 + (i % 20))}:00`;
  const duration = running
    ? null
    : failed
      ? 69
      : partial
        ? 372
        : 135 + ((i * 17) % 90);
  return {
    jobId: 1042 - i,
    jobName: 'market_daily_batch',
    businessDate,
    status,
    startedAt,
    endedAt: running
      ? null
      : `${shiftDate(businessDate, 1)}T06:${pad(10 + (i % 20) + Math.floor((duration ?? 0) / 60))}:${pad((duration ?? 0) % 60)}`,
    durationSeconds: duration,
    marketScope: 'GLOBAL',
    rawNewsCount: failed ? 21 : partial ? 126 : 174 - (i % 30),
    processedNewsCount: failed ? 0 : partial ? 74 : 114 - (i % 22),
    clusterCount: failed ? 0 : partial ? 15 : 21 - (i % 6),
    pageId: failed ? null : 501 - i,
    pageVersionNo: failed ? null : 3 - (i % 2),
    partialMessage: partial
      ? '한국 지수 2종 수집 실패, 미국 AI 요약 1건 미생성'
      : null,
  };
}

const BATCH_ALL = rep(27, batchItem);

export function batchListFixture(mode, page, size = 20, status = '') {
  if (mode === 'empty') {
    return {
      items: [],
      pagination: { page: 1, size, totalCount: 0 },
      summary: {
        successCount: 0,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 0,
      },
    };
  }
  const filtered = status
    ? BATCH_ALL.filter((r) => r.status === status)
    : BATCH_ALL;
  const start = (page - 1) * size;
  const done = BATCH_ALL.filter((r) => r.durationSeconds !== null);
  return {
    items: filtered.slice(start, start + size),
    pagination: { page, size, totalCount: filtered.length },
    summary: {
      successCount: BATCH_ALL.filter((r) => r.status === 'SUCCESS').length,
      partialCount: BATCH_ALL.filter((r) => r.status === 'PARTIAL').length,
      failedCount: BATCH_ALL.filter((r) => r.status === 'FAILED').length,
      avgDurationSeconds: Math.round(
        done.reduce((a, r) => a + r.durationSeconds, 0) / done.length
      ),
    },
  };
}

const LONG_LOG = (() => {
  const lines = [
    'step=collect_news provider=naver keyword_group=us_market status=timeout elapsed_ms=10014 retry=3/3',
    'step=collect_news provider=naver keyword_group=us_market request_id=req-20260727-0141 http_status=504',
    'Traceback (most recent call last):',
    '  File "/app/app/batch/steps/collect_news.py", line 118, in run',
    '    payload = await self._provider.search(keyword=keyword, display=100, start=offset)',
    '  File "/app/app/batch/providers/naver_news.py", line 74, in search',
    '    response = await self._client.get(url, params=params, timeout=self._timeout)',
    'httpx.ReadTimeout: The read operation timed out after 10.0 seconds',
    'step=collect_news outcome=aborted collected=21 expected_min=60 policy=batch_status_policy.FAILED',
    'step=collect_market_indices status=skipped reason=upstream_step_failed',
    'step=dedupe_articles status=skipped reason=upstream_step_failed',
    'step=build_clusters status=skipped reason=upstream_step_failed',
    'step=generate_ai_summaries status=skipped reason=upstream_step_failed',
    'step=build_page_snapshot status=skipped reason=upstream_step_failed page_id=None',
    'step=finalize_job status=FAILED error_code=NEWS_SOURCE_TIMEOUT retryable=true',
  ];
  let out = '';
  let i = 0;
  while (out.length < 4000) {
    out += `2026-07-27T06:${pad(10 + (i % 40))}:${pad(i % 60)} ${lines[i % lines.length]}\n`;
    i += 1;
  }
  return out;
})();

function stagesFor(status) {
  const done = (label, sec) => ({
    label,
    status: 'SUCCESS',
    durationSeconds: sec,
    note: null,
  });
  if (status === 'RUNNING') {
    return [
      done('작업 생성', 1),
      done('뉴스 수집', 96),
      done('지수 수집', 12),
      {
        label: '중복 제거',
        status: 'RUNNING',
        durationSeconds: null,
        note: '진행 중',
      },
      ...BATCH_STAGES.slice(4).map((s) => ({
        label: s.label,
        status: 'PENDING',
        durationSeconds: null,
        note: null,
      })),
    ];
  }
  if (status === 'FAILED') {
    return [
      done('작업 생성', 1),
      {
        label: '뉴스 수집',
        status: 'FAILED',
        durationSeconds: 68,
        note: 'provider 응답 타임아웃 (재시도 3회 소진)',
      },
      ...BATCH_STAGES.slice(2).map((s) => ({
        label: s.label,
        status: 'SKIPPED',
        durationSeconds: null,
        note: '이전 단계 실패로 건너뜀',
      })),
    ];
  }
  if (status === 'PARTIAL') {
    return [
      done('작업 생성', 1),
      done('뉴스 수집', 148),
      {
        label: '지수 수집',
        status: 'PARTIAL',
        durationSeconds: 31,
        note: 'KRX 300, USD/KRW 2종 실패',
      },
      done('중복 제거', 22),
      done('클러스터 구성', 41),
      {
        label: 'AI 요약 생성',
        status: 'PARTIAL',
        durationSeconds: 118,
        note: '미국 클러스터 1건 요약 미생성',
      },
      done('페이지 스냅샷', 9),
      done('작업 종료', 2),
    ];
  }
  return [
    done('작업 생성', 1),
    done('뉴스 수집', 92),
    done('지수 수집', 14),
    done('중복 제거', 9),
    done('클러스터 구성', 12),
    done('AI 요약 생성', 63),
    done('페이지 스냅샷', 6),
    done('작업 종료', 1),
  ];
}

export function batchDetailFixture(jobId, mode) {
  const item = BATCH_ALL.find((r) => r.jobId === jobId) ?? BATCH_ALL[0];
  const failed = item.status === 'FAILED';
  const partial = item.status === 'PARTIAL';
  return {
    ...item,
    forceRun: item.jobId % 4 === 0,
    rebuildPageOnly: false,
    errorCode: failed ? 'NEWS_SOURCE_TIMEOUT' : null,
    errorMessage: failed
      ? '원문 공급자 응답 제한 시간을 초과했습니다. 재시도 3회를 모두 소진한 뒤 작업이 중단됐습니다.'
      : null,
    logSummary: failed
      ? mode === 'longLog'
        ? LONG_LOG
        : LONG_LOG.slice(0, 1200)
      : partial
        ? '지수 2종과 AI 요약 1건이 누락된 상태로 페이지 스냅샷을 생성했습니다. 재실행 시 rebuildPageOnly=false 권장.'
        : '정상 처리. 시장 데이터, 기사 수집, 클러스터링이 SLA 안에서 종료됐습니다.',
    // [PROPOSED][BACKEND] 단계별 상태는 현재 API에 없음 — batch/steps 모듈명을 근거로 한 가정
    stages: stagesFor(item.status),
    impact: failed
      ? [
          '미국·한국 시장 스냅샷 미생성',
          `${item.businessDate} 아카이브 항목 없음`,
          '해당 날짜 클러스터 상세 진입 불가',
        ]
      : partial
        ? [
            '한국 지수 카드 2종 누락',
            '미국 클러스터 요약 1건 누락',
            '아카이브 상태 PARTIAL로 표시',
          ]
        : [],
    retryable: failed || partial,
  };
}

export function triggerResult(mode, businessDate) {
  const base = {
    jobId: 1043,
    jobName: 'market_daily_batch',
    businessDate: businessDate || TODAY,
    status: 'RUNNING',
    startedAt: '2026-07-27T08:24:31',
  };
  if (mode === 'conflict409') {
    return {
      error: {
        http: 409,
        code: 'BATCH_ALREADY_RUNNING',
        message: `${businessDate || TODAY} 배치가 이미 실행 중입니다.`,
        existingJobId: 1042,
      },
    };
  }
  if (mode === 'forbidden403')
    return {
      error: {
        http: 403,
        code: 'FORBIDDEN',
        message: '수동 실행 권한이 없습니다. Operator 권한이 필요합니다.',
      },
    };
  if (mode === 'validation422')
    return {
      error: {
        http: 422,
        code: 'INVALID_BUSINESS_DATE',
        message: '미래 날짜는 실행할 수 없습니다.',
        field: 'businessDate',
      },
    };
  if (mode === 'rate429')
    return {
      error: {
        http: 429,
        code: 'RATE_LIMITED',
        message: '요청이 너무 많습니다. 60초 후 다시 시도해 주세요.',
        retryAfter: 60,
      },
    };
  if (mode === 'error500')
    return {
      error: {
        http: 500,
        code: 'INTERNAL_BATCH_ERROR',
        message: '배치 실행 요청을 처리하지 못했습니다.',
      },
    };
  if (mode === 'offline')
    return {
      error: {
        http: 0,
        code: 'NETWORK_ERROR',
        message: '네트워크에 연결할 수 없습니다.',
      },
    };
  return { data: base };
}

// ── 오류 등가군 ──────────────────────────────────────────────────────
export const ERRORS = {
  error401: {
    http: 401,
    code: 'SESSION_EXPIRED',
    title: '세션이 만료됐습니다',
    message: '다시 로그인하면 마지막으로 보던 화면으로 돌아옵니다.',
    action: '다시 로그인',
  },
  error403: {
    http: 403,
    code: 'FORBIDDEN',
    title: '이 화면에 접근할 권한이 없습니다',
    message: '운영 화면은 Operator 권한이 있는 계정만 열 수 있습니다.',
    action: '최신 브리프로 이동',
  },
  error404: {
    http: 404,
    code: 'PAGE_NOT_FOUND',
    title: '해당 날짜의 스냅샷이 없습니다',
    message: '배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.',
    action: '아카이브에서 찾기',
  },
  clusterNotFound: {
    http: 404,
    code: 'CLUSTER_NOT_FOUND',
    title: '이 이슈를 찾을 수 없습니다',
    message: '클러스터가 재생성되면서 ID가 변경됐을 수 있습니다.',
    action: '해당 날짜 브리프로 이동',
  },
  error429: {
    http: 429,
    code: 'RATE_LIMITED',
    title: '요청이 너무 많습니다',
    message: '60초 후 자동으로 다시 시도합니다.',
    action: '지금 다시 시도',
  },
  error500: {
    http: 500,
    code: 'INTERNAL_ERROR',
    title: '데이터를 불러오지 못했습니다',
    message: '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    action: '다시 시도',
  },
  offline: {
    http: 0,
    code: 'NETWORK_ERROR',
    title: '네트워크에 연결할 수 없습니다',
    message:
      '연결을 확인한 뒤 다시 시도해 주세요. 마지막으로 불러온 내용은 아래에 그대로 유지됩니다.',
    action: '다시 시도',
  },
  malformed: {
    http: 200,
    code: 'MALFORMED_RESPONSE',
    title: '응답 형식이 올바르지 않습니다',
    message:
      'markets 배열이 없는 응답을 받았습니다. 배치 상태를 확인해 주세요.',
    action: '배치 상태 열기',
  },
};

export const LONG_SAMPLES = { token: LONG_TOKEN, url: LONG_URL, log: LONG_LOG };
