export type StatusTone = 'ready' | 'partial' | 'failed' | 'success';

export type MarketIndex = {
  label: string;
  value: string;
  change: string;
  changeRate: string;
  direction: 'up' | 'down';
  high: string;
  low: string;
};

export type ClusterCard = {
  id: string;
  articleCount: number;
  title: string;
  summary: string;
  tags: string[];
};

export type MarketSnapshot = {
  businessDate: string;
  generatedAt: string;
  status: StatusTone;
  globalHeadline: string;
  markets: {
    label: string;
    summaryTitle: string;
    summaryBody: string;
    indices: MarketIndex[];
    clusters: ClusterCard[];
  }[];
};

export type ArchiveRecord = {
  businessDate: string;
  headline: string;
  status: 'READY' | 'PARTIAL' | 'FAILED';
  generatedAt: string;
};

export type ClusterArticle = {
  id: string;
  source: string;
  publishedAt: string;
  title: string;
  originalUrl: string;
  mirrorUrl: string;
};

export type ClusterDetail = {
  id: string;
  businessDate: string;
  marketLabel: string;
  title: string;
  tags: string[];
  analysis: string[];
  articles: ClusterArticle[];
  representative: ClusterArticle & {
    sourceSummary: string;
  };
  articleCount: number;
  updatedAt: string;
};

export type BatchRun = {
  id: string;
  market: 'US Market' | 'KR Market';
  businessDate: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  finishedAt: string;
  duration: string;
  counts: string;
  detail: string;
};

export const latestMarketSnapshot: MarketSnapshot = {
  businessDate: '2026-03-17',
  generatedAt: '2026-03-18 06:12',
  status: 'ready',
  globalHeadline: '기술주 강세와 외국인 매수세 회복으로 미·한 증시 모두 강세',
  markets: [
    {
      label: '미국 증시 일간 요약',
      summaryTitle: '반도체와 대형 성장주가 시장 주도권을 회복',
      summaryBody:
        'PPI 둔화 신호와 장기 금리 하락이 나스닥 중심 랠리를 자극했습니다. AI 인프라 투자 기대가 엔비디아와 AMD 같은 반도체 종목 전반에 매수세를 확산시켰습니다.',
      indices: [
        {
          label: 'NASDAQ Composite',
          value: '16,274.94',
          change: '+120.33',
          changeRate: '+0.74%',
          direction: 'up',
          high: '16,302.11',
          low: '16,180.45',
        },
        {
          label: 'S&P 500',
          value: '5,117.09',
          change: '+32.55',
          changeRate: '+0.64%',
          direction: 'up',
          high: '5,130.42',
          low: '5,098.22',
        },
        {
          label: 'DOW JONES',
          value: '38,790.43',
          change: '-15.62',
          changeRate: '-0.04%',
          direction: 'down',
          high: '38,920.15',
          low: '38,710.88',
        },
      ],
      clusters: [
        {
          id: 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678',
          articleCount: 6,
          title: '엔비디아 GTC 2026 기대감에 반도체주 동반 랠리',
          summary:
            '차세대 AI 칩 공개 기대와 투자 사이클 확장 전망이 맞물리며 반도체 업종 전반의 밸류에이션이 재평가되는 흐름이 나타났습니다.',
          tags: ['NVIDIA', 'SEMICONDUCTOR', 'AI'],
        },
        {
          id: 'aa13f5f0-2152-41f2-b16d-f0001a7298a4',
          articleCount: 4,
          title: '생산자물가 둔화가 금리 인하 기대를 키우며 성장주 강세',
          summary:
            '예상치를 밑돈 물가 지표가 국채 금리를 끌어내렸고, 고밸류 기술주의 멀티플 확장 기대가 재점화됐습니다.',
          tags: ['PPI', 'FED', 'RATES'],
        },
      ],
    },
    {
      label: '한국 증시 일간 요약',
      summaryTitle: '외국인 순매수와 반도체 대형주 강세가 코스피 반등 견인',
      summaryBody:
        '원화 안정과 메모리 가격 기대가 겹치면서 외국인 매수세가 확대됐습니다. 대형주 중심 반등이 나타났지만 내수주는 여전히 선별 장세가 이어졌습니다.',
      indices: [
        {
          label: 'KOSPI',
          value: '2,781.42',
          change: '+23.80',
          changeRate: '+0.86%',
          direction: 'up',
          high: '2,786.11',
          low: '2,759.84',
        },
        {
          label: 'KOSDAQ',
          value: '912.66',
          change: '+4.25',
          changeRate: '+0.47%',
          direction: 'up',
          high: '915.04',
          low: '905.12',
        },
        {
          label: 'USD/KRW',
          value: '1,318.20',
          change: '-6.10',
          changeRate: '-0.46%',
          direction: 'down',
          high: '1,324.00',
          low: '1,316.50',
        },
      ],
      clusters: [
        {
          id: '338e20f0-8d76-4a20-9e8f-7ad6105f61bf',
          articleCount: 5,
          title: '삼성전자·SK하이닉스 강세에 코스피 2,780선 회복',
          summary: 'HBM 수요 기대와 미국 반도체 강세가 국내 대형 메모리주로 전이되면서 지수 상단을 끌어올렸습니다.',
          tags: ['KOSPI', 'HBM', 'FOREIGNERS'],
        },
        {
          id: 'a2c7c439-c68e-4ef5-8c23-f267d87a4722',
          articleCount: 3,
          title: '2차전지와 인터넷은 차익실현, 지수는 대형주 장세로 압축',
          summary:
            '업종 순환이 뚜렷해지면서 지수 상승과 체감 난이도 간 괴리가 커졌고, 시장은 대형주 중심 방어적 랠리 양상을 보였습니다.',
          tags: ['KOSDAQ', 'ROTATION', 'LARGE_CAP'],
        },
      ],
    },
  ],
};

export const archiveMarketSnapshots: Record<string, MarketSnapshot> = {
  '2026-03-17': latestMarketSnapshot,
  '2026-03-12': {
    ...latestMarketSnapshot,
    businessDate: '2026-03-12',
    generatedAt: '2026-03-13 06:09',
    globalHeadline: '고용 둔화 신호와 실적 기대가 맞물리며 위험자산 선호 회복',
  },
};

export const archiveRecords: ArchiveRecord[] = [
  {
    businessDate: '2026-03-17',
    headline: '엔비디아 실적 기대가 반도체와 AI 인프라 종목 전반으로 확산',
    status: 'READY',
    generatedAt: '06:15:22',
  },
  {
    businessDate: '2026-03-16',
    headline: '금리 동결 기대와 소비 둔화 신호가 혼재하며 증시 혼조 마감',
    status: 'READY',
    generatedAt: '06:12:45',
  },
  {
    businessDate: '2026-03-15',
    headline: '데이터 수집 지연으로 일부 섹터 뉴스 클러스터가 누락된 상태',
    status: 'PARTIAL',
    generatedAt: '07:45:10',
  },
  {
    businessDate: '2026-03-14',
    headline: '에너지 가격 급등이 인플레이션 우려를 키우며 성장주 변동성 확대',
    status: 'FAILED',
    generatedAt: '05:58:09',
  },
  {
    businessDate: '2026-03-13',
    headline: '외국인 순매수 확대와 메모리 업황 개선이 코스피를 지지',
    status: 'READY',
    generatedAt: '06:08:59',
  },
];

export const clusterDetails: Record<string, ClusterDetail> = {
  'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678': {
    id: 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678',
    businessDate: '2026-03-17',
    marketLabel: '미국',
    title: '금리 인하 기대와 반도체 실적 개선 기대가 기술주를 견인',
    tags: ['금리', '기술주', '반도체', '나스닥'],
    analysis: [
      '연방준비제도의 금리 인하 경로가 더 명확해졌다는 해석이 확산되며 고밸류 성장주에 대한 할인율 부담이 완화됐습니다.',
      '엔비디아와 AMD를 포함한 반도체 업종은 AI 서버 수요와 차세대 칩 공개 기대가 동시에 반영되며 지수 대비 초과수익을 기록했습니다.',
      '생산자물가 둔화가 장기 금리 안정으로 이어지면서, 단기 모멘텀뿐 아니라 실적 시즌을 앞둔 포지셔닝 성격의 매수도 유입됐습니다.',
      '다만 유가와 지정학 이슈가 여전히 남아 있어, 향후 랠리 지속성은 거시 변수의 추가 안정 여부에 달려 있습니다.',
    ],
    representative: {
      id: 'wsj-1',
      source: '월스트리트 저널',
      publishedAt: '08:15 AM',
      title: '나스닥, 기술주 중심의 강력한 반등... 금리 인하론에 힘 실려',
      originalUrl: 'https://example.com/original-wsj',
      mirrorUrl: 'https://example.com/naver-wsj',
      sourceSummary: '경제·금융 전문 매체',
    },
    articles: [
      {
        id: 'wsj-1',
        source: '월스트리트 저널',
        publishedAt: '08:15 AM',
        title: '나스닥, 기술주 중심의 강력한 반등... 금리 인하론에 힘 실려',
        originalUrl: 'https://example.com/original-wsj',
        mirrorUrl: 'https://example.com/naver-wsj',
      },
      {
        id: 'bloomberg-1',
        source: '블룸버그',
        publishedAt: '09:30 AM',
        title: '반도체 지수 3% 급등, 엔비디아 사상 최고가 경신 임박',
        originalUrl: 'https://example.com/original-bloomberg',
        mirrorUrl: 'https://example.com/naver-bloomberg',
      },
      {
        id: 'reuters-1',
        source: '로이터',
        publishedAt: '11:05 AM',
        title: '인플레이션 둔화 신호에 국채 금리 급락, 대형 기술주 일제히 상승',
        originalUrl: 'https://example.com/original-reuters',
        mirrorUrl: 'https://example.com/naver-reuters',
      },
      {
        id: 'ft-1',
        source: '파이낸셜 타임즈',
        publishedAt: '01:45 PM',
        title: '연준 위원들의 비둘기파적 발언, 시장은 6월 인하 가능성 80%로 반영',
        originalUrl: 'https://example.com/original-ft',
        mirrorUrl: 'https://example.com/naver-ft',
      },
    ],
    articleCount: 24,
    updatedAt: '오후 2:30',
  },
};

export const batchRuns: BatchRun[] = [
  {
    id: 'job-99281-b',
    market: 'US Market',
    businessDate: '2026-03-17',
    status: 'SUCCESS',
    startedAt: '08:00:01',
    finishedAt: '08:14:12',
    duration: '14m 11s',
    counts: '77 / 32 / 9',
    detail: '정상 처리. 시장 데이터, 기사 수집, 클러스터링이 모두 SLA 안에서 종료됐습니다.',
  },
  {
    id: 'job-99282-a',
    market: 'KR Market',
    businessDate: '2026-03-17',
    status: 'PARTIAL',
    startedAt: '16:30:05',
    finishedAt: '16:51:20',
    duration: '21m 15s',
    counts: '112 / 88 / 14',
    detail: 'KR 미러 소스 일부 지연으로 기사 번역 결과가 일부 누락됐습니다.',
  },
  {
    id: 'job-99281-b-failed',
    market: 'US Market',
    businessDate: '2026-03-16',
    status: 'FAILED',
    startedAt: '08:00:02',
    finishedAt: '08:02:14',
    duration: '2m 12s',
    counts: '12 / 0 / 0',
    detail: 'CRITICAL: WebSocket timeout during NYSE scrape. Peer disconnected after 3000ms.',
  },
  {
    id: 'job-99270-z',
    market: 'KR Market',
    businessDate: '2026-03-16',
    status: 'SUCCESS',
    startedAt: '16:30:01',
    finishedAt: '16:44:55',
    duration: '14m 54s',
    counts: '108 / 108 / 15',
    detail: '정상 처리. 한국 기사군 동기화와 클러스터 생성이 모두 완료됐습니다.',
  },
];
