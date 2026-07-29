const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:4173';
const captureMode = process.env.CAPTURE_MODE ?? 'app';
const screenshotDir = path.resolve(__dirname, 'screenshots');
const appOrigin = new URL(baseUrl).origin;

const clusterId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function envelope(data) {
  return {
    success: true,
    data,
    meta: {
      requestId: 'design-v2-playwright',
      timestamp: '2026-07-27T10:00:00+09:00',
    },
  };
}

function marketSection({ marketType, marketLabel, indexSeed, clusterSeed }) {
  const isUs = marketType === 'US';

  return {
    marketType,
    marketLabel,
    summaryTitle: isUs
      ? '빅테크 실적 기대와 금리 경계가 교차'
      : '반도체 수급 개선과 외국인 매수세 유입',
    summaryBody: isUs
      ? '미국 시장은 주요 기술주의 실적 기대가 지수 상단을 지지했지만, 장기 금리 반등으로 장중 변동성이 확대되었습니다. 에너지와 금융 업종은 경기 지표를 소화하며 혼조세를 보였습니다.'
      : '한국 시장은 반도체 업황 회복 기대와 외국인 순매수에 힘입어 상승했습니다. 원화 강세가 수급에 우호적으로 작용했으나 이차전지 업종은 종목별 차별화가 이어졌습니다.',
    analysis: {
      background: ['거시 지표와 기업 실적을 함께 반영한 일일 요약입니다.'],
      keyThemes: ['유동성', '실적', '수급'],
      outlook: '단기 변동성 확대 가능성을 점검해야 합니다.',
    },
    indices: [
      {
        indexCode: `${marketType}-1`,
        indexName: isUs ? 'S&P 500' : 'KOSPI',
        closePrice: isUs ? '5,487.03' : '2,765.53',
        changeValue: isUs ? '21.43' : '18.21',
        changePercent: isUs ? '0.39' : '0.66',
        highPrice: isUs ? '5,499.80' : '2,772.11',
        lowPrice: isUs ? '5,455.22' : '2,742.48',
      },
      {
        indexCode: `${marketType}-2`,
        indexName: isUs ? 'NASDAQ' : 'KOSDAQ',
        closePrice: isUs ? '17,862.23' : '812.77',
        changeValue: isUs ? '87.51' : '-2.84',
        changePercent: isUs ? '0.49' : '-0.35',
        highPrice: isUs ? '17,910.34' : '819.24',
        lowPrice: isUs ? '17,720.03' : '808.90',
      },
      {
        indexCode: `${marketType}-3`,
        indexName: isUs ? 'DOW' : 'KRX 300',
        closePrice: isUs ? '39,308.00' : '1,684.91',
        changeValue: isUs ? '-23.85' : '6.04',
        changePercent: isUs ? '-0.06' : '0.36',
        highPrice: isUs ? '39,430.10' : '1,691.20',
        lowPrice: isUs ? '39,180.42' : '1,672.81',
      },
    ],
    topClusters: [
      {
        clusterId:
          clusterSeed === 1
            ? clusterId
            : 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        title: isUs
          ? '연준 위원 발언 이후 장기 금리 반등'
          : '반도체 수출 개선 기대에 대형주 강세',
        summary: isUs
          ? '정책금리 경로에 대한 신중론이 재확인되며 성장주 중심으로 장중 등락이 확대됐습니다.'
          : '메모리 가격 회복과 수출 지표 개선이 외국인 수급을 자극했습니다.',
        articleCount: 7 + indexSeed,
        tags: isUs
          ? ['Fed', 'Treasury', 'Big Tech']
          : ['반도체', '외국인', '수출'],
        representativeArticle: {
          title: '대표 기사 제목',
          publisherName: 'Market Wire',
          publishedAt: '2026-07-27T08:30:00+09:00',
          originLink: 'https://example.com/original',
          naverLink: 'https://example.com/mirror',
        },
      },
      {
        clusterId:
          clusterSeed === 1
            ? 'cccccccc-cccc-cccc-cccc-cccccccccccc'
            : 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        title: isUs
          ? 'AI 인프라 투자 확대가 반도체주 지지'
          : '원화 강세와 외국인 현물 순매수 확대',
        summary: isUs
          ? '클라우드 사업자의 설비투자 계획이 관련 공급망 실적 기대를 높였습니다.'
          : '환율 안정이 외국인 위험 선호 회복과 대형주 수급 개선으로 이어졌습니다.',
        articleCount: 5 + indexSeed,
        tags: isUs
          ? ['AI', 'Semiconductor', 'Capex']
          : ['환율', '수급', '대형주'],
        representativeArticle: {
          title: '대표 기사 제목',
          publisherName: 'Daily Finance',
          publishedAt: '2026-07-27T07:45:00+09:00',
          originLink: 'https://example.com/original-2',
          naverLink: 'https://example.com/mirror-2',
        },
      },
    ],
    articleLinks: [],
    metadata: {
      rawNewsCount: 92,
      processedNewsCount: 81,
      clusterCount: 12,
      lastUpdatedAt: '2026-07-27T09:45:00+09:00',
      partialMessage: null,
    },
  };
}

function dailyPage(status = 'READY', options = {}) {
  const businessDate = options.businessDate ?? '2026-07-27';
  return {
    pageId: options.pageId ?? 42,
    businessDate,
    versionNo: 3,
    pageTitle: `${businessDate} Market Daily Brief`,
    status,
    globalHeadline:
      status === 'PARTIAL'
        ? '일부 뉴스 소스 지연 속에서도 기술주와 반도체가 시장 방향성을 주도'
        : status === 'FAILED'
          ? '시장 요약 생성 실패 상태 — 마지막 수집 데이터 기준'
          : '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목',
    generatedAt: '2026-07-27T09:50:00+09:00',
    partialMessage:
      status === 'PARTIAL' ? '일부 해외 뉴스 소스가 지연되었습니다.' : null,
    markets: options.emptyMarkets
      ? []
      : [
          marketSection({
            marketType: 'US',
            marketLabel: 'US Market',
            indexSeed: 1,
            clusterSeed: 1,
          }),
          marketSection({
            marketType: 'KR',
            marketLabel: 'KR Market',
            indexSeed: 2,
            clusterSeed: 2,
          }),
        ],
    metadata: {
      rawNewsCount: 184,
      processedNewsCount: 163,
      clusterCount: 24,
      lastUpdatedAt: '2026-07-27T09:45:00+09:00',
    },
  };
}

const archiveItems = [
  {
    pageId: 42,
    businessDate: '2026-07-27',
    pageTitle: '2026-07-27 Market Daily Brief',
    headlineSummary: '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선',
    status: 'READY',
    generatedAt: '2026-07-27T09:50:00+09:00',
    partialMessage: null,
  },
  {
    pageId: 41,
    businessDate: '2026-07-26',
    pageTitle: '2026-07-26 Market Daily Brief',
    headlineSummary: '원자재 가격 반등과 달러 약세가 업종별 차별화 촉발',
    status: 'PARTIAL',
    generatedAt: '2026-07-26T09:48:00+09:00',
    partialMessage: '일부 원문 수집 지연',
  },
  {
    pageId: 40,
    businessDate: '2026-07-25',
    pageTitle: '2026-07-25 Market Daily Brief',
    headlineSummary: '기업 실적 발표를 앞두고 주요 지수 제한적 상승',
    status: 'READY',
    generatedAt: '2026-07-25T09:44:00+09:00',
    partialMessage: null,
  },
  {
    pageId: 39,
    businessDate: '2026-07-24',
    pageTitle: '2026-07-24 Market Daily Brief',
    headlineSummary: null,
    status: 'FAILED',
    generatedAt: '2026-07-24T10:03:00+09:00',
    partialMessage: '요약 생성 단계 실패',
  },
  {
    pageId: 38,
    businessDate: '2026-07-23',
    pageTitle: '2026-07-23 Market Daily Brief',
    headlineSummary: '정책 기대와 실적 경계가 공존한 혼조 장세',
    status: 'READY',
    generatedAt: '2026-07-23T09:51:00+09:00',
    partialMessage: null,
  },
  {
    pageId: 37,
    businessDate: '2026-07-22',
    pageTitle: '2026-07-22 Market Daily Brief',
    headlineSummary: '위험 선호 회복으로 성장주 중심 반등',
    status: 'READY',
    generatedAt: '2026-07-22T09:46:00+09:00',
    partialMessage: null,
  },
];

function archiveList(page = 1, empty = false) {
  const size = 4;
  const items = empty ? [] : archiveItems.slice((page - 1) * size, page * size);

  return {
    items,
    pagination: {
      page,
      size,
      totalCount: empty ? 0 : archiveItems.length,
    },
  };
}

function clusterDetail(sparse = false) {
  const articles = sparse
    ? []
    : [
        {
          processedArticleId: 501,
          title: '연준 위원, 인플레이션 둔화 확인 전까지 신중한 접근 강조',
          publisherName: 'Reuters',
          publishedAt: '2026-07-27T07:42:00+09:00',
          originLink: 'https://example.com/reuters-fed',
          naverLink: 'https://example.com/naver-reuters-fed',
          sourceSummary: '정책 전환 시점에 대한 신중한 메시지가 이어졌습니다.',
        },
        {
          processedArticleId: 502,
          title: '미 국채 10년물 금리 반등, 기술주 장중 변동성 확대',
          publisherName: 'Bloomberg',
          publishedAt: '2026-07-27T08:05:00+09:00',
          originLink: 'https://example.com/bloomberg-yield',
          naverLink: 'https://example.com/naver-bloomberg-yield',
          sourceSummary: '금리 변화가 성장주 밸류에이션에 영향을 미쳤습니다.',
        },
        {
          processedArticleId: 503,
          title: '대형 기술주 실적 기대가 금리 부담 일부 상쇄',
          publisherName: 'CNBC',
          publishedAt: '2026-07-27T08:31:00+09:00',
          originLink: 'https://example.com/cnbc-tech',
          naverLink: 'https://example.com/naver-cnbc-tech',
          sourceSummary:
            'AI 투자 확대 기대가 반도체와 플랫폼주를 지지했습니다.',
        },
      ];

  return {
    clusterId,
    businessDate: '2026-07-27',
    marketType: 'US',
    marketLabel: 'US Market',
    title: sparse
      ? '기사 연결이 완료되지 않은 뉴스 클러스터'
      : '연준 신중론과 장기 금리 반등이 기술주 변동성 확대',
    tags: sparse ? [] : ['Fed', 'Treasury', 'Big Tech'],
    summary: {
      short: sparse
        ? null
        : '정책금리 경로 불확실성과 실적 기대가 동시에 가격에 반영됐습니다.',
      long: null,
      analysis: sparse
        ? []
        : [
            '연준 위원들의 발언은 물가 둔화 추세를 인정하면서도 정책 전환을 서두르지 않겠다는 공통된 메시지를 담고 있습니다.',
            '장기 금리 반등은 고평가 성장주에 부담으로 작용했지만, AI 인프라 투자와 대형 기술주 실적 기대가 하방을 제한했습니다.',
            '향후 핵심 관찰 지표는 개인소비지출 물가와 주요 플랫폼 기업의 설비투자 가이던스입니다.',
          ],
    },
    representativeArticle: sparse
      ? {
          processedArticleId: null,
          title: '대표 기사가 아직 지정되지 않았습니다.',
          publisherName: null,
          publishedAt: null,
          originLink: 'javascript:alert(1)',
          naverLink: '',
          sourceSummary: null,
        }
      : articles[0],
    articles,
    lastUpdatedAt: '2026-07-27T09:45:00+09:00',
    articleCount: sparse ? 0 : articles.length,
  };
}

const batchItems = [
  {
    jobId: 201,
    jobName: 'market-daily-us',
    businessDate: '2026-07-27',
    status: 'SUCCESS',
    startedAt: '2026-07-27T05:30:00+09:00',
    endedAt: '2026-07-27T05:34:18+09:00',
    durationSeconds: 258,
    marketScope: 'US Market',
    rawNewsCount: 102,
    processedNewsCount: 98,
    clusterCount: 14,
    pageId: 42,
    pageVersionNo: 3,
    partialMessage: null,
  },
  {
    jobId: 202,
    jobName: 'market-daily-kr',
    businessDate: '2026-07-27',
    status: 'PARTIAL',
    startedAt: '2026-07-27T05:10:00+09:00',
    endedAt: '2026-07-27T05:16:12+09:00',
    durationSeconds: 372,
    marketScope: 'KR Market',
    rawNewsCount: 88,
    processedNewsCount: 73,
    clusterCount: 10,
    pageId: 42,
    pageVersionNo: 3,
    partialMessage: '해외 원문 15건의 본문 수집이 지연되었습니다.',
  },
  {
    jobId: 203,
    jobName: 'market-daily-us',
    businessDate: '2026-07-26',
    status: 'FAILED',
    startedAt: '2026-07-26T05:30:00+09:00',
    endedAt: '2026-07-26T05:31:09+09:00',
    durationSeconds: 69,
    marketScope: 'US Market',
    rawNewsCount: 21,
    processedNewsCount: 0,
    clusterCount: 0,
    pageId: null,
    pageVersionNo: null,
    partialMessage:
      'NEWS_SOURCE_TIMEOUT: 원문 공급자 응답 제한 시간을 초과했습니다.',
  },
  {
    jobId: 204,
    jobName: 'market-daily-kr',
    businessDate: '2026-07-26',
    status: 'SUCCESS',
    startedAt: '2026-07-26T05:10:00+09:00',
    endedAt: '2026-07-26T05:14:41+09:00',
    durationSeconds: 281,
    marketScope: 'KR Market',
    rawNewsCount: 91,
    processedNewsCount: 86,
    clusterCount: 12,
    pageId: 41,
    pageVersionNo: 2,
    partialMessage: null,
  },
];

function batchList(empty = false, page = 1, totalCount = batchItems.length) {
  return {
    items: empty ? [] : batchItems,
    pagination: {
      page,
      size: 20,
      totalCount: empty ? 0 : totalCount,
    },
    summary: empty
      ? {
          successCount: 0,
          partialCount: 0,
          failedCount: 0,
          avgDurationSeconds: 0,
        }
      : {
          successCount: 2,
          partialCount: 1,
          failedCount: 1,
          avgDurationSeconds: 245,
        },
  };
}

function batchDetail(jobId) {
  const item = batchItems.find((candidate) => candidate.jobId === jobId);
  if (!item) {
    return null;
  }

  return {
    jobId: item.jobId,
    jobName: item.jobName,
    businessDate: item.businessDate,
    status: item.status,
    forceRun: false,
    rebuildPageOnly: false,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationSeconds: item.durationSeconds,
    rawNewsCount: item.rawNewsCount,
    processedNewsCount: item.processedNewsCount,
    clusterCount: item.clusterCount,
    pageId: item.pageId,
    pageVersionNo: item.pageVersionNo,
    partialMessage: item.partialMessage,
    errorCode: item.status === 'FAILED' ? 'NEWS_SOURCE_TIMEOUT' : null,
    errorMessage:
      item.status === 'FAILED'
        ? '원문 공급자 응답 제한 시간을 초과했습니다.'
        : null,
    logSummary:
      item.status === 'SUCCESS'
        ? '모든 수집·정규화·클러스터링·페이지 생성 단계가 정상 완료되었습니다.'
        : item.partialMessage,
  };
}

function scenarioFromRequest(request) {
  try {
    return new URL(request.frame().url()).searchParams.get('mock') ?? 'ready';
  } catch {
    return 'ready';
  }
}

function jsonHeaders() {
  return {
    'access-control-allow-origin': appOrigin,
    'access-control-allow-credentials': 'true',
    'content-type': 'application/json; charset=utf-8',
  };
}

function delayed(ms = 15000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function installMockApi(page) {
  await page.route('http://mock.api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const scenario = scenarioFromRequest(request);

    if (url.pathname === '/login') {
      if (scenario === 'auth-redirecting') {
        return route.abort('aborted');
      }

      await delayed();
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<h1>Mock login page</h1>',
      });
    }

    if (url.pathname === '/api/user/token') {
      if (scenario === 'auth-loading') {
        await delayed();
      }

      if (scenario === 'auth-redirecting') {
        return route.fulfill({
          status: 401,
          headers: jsonHeaders(),
          body: JSON.stringify({ detail: 'expired session' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ accessToken: 'mock-design-token' }),
      });
    }

    const isLoading =
      scenario === 'market-loading' ||
      scenario === 'archive-detail-loading' ||
      scenario === 'archive-list-loading' ||
      scenario === 'cluster-loading' ||
      scenario === 'batch-list-loading';

    if (isLoading) {
      await delayed();
    }

    const errorScenarioByPath =
      (scenario === 'market-error' &&
        url.pathname.includes('/stock/api/pages/daily')) ||
      (scenario === 'archive-detail-error' &&
        (url.pathname === '/stock/api/pages/daily' ||
          /^\/stock\/api\/pages\/\d+$/.test(url.pathname))) ||
      (scenario === 'archive-list-error' &&
        url.pathname === '/stock/api/pages/archive') ||
      (scenario === 'cluster-error' &&
        url.pathname.startsWith('/stock/api/news/clusters/')) ||
      (scenario === 'batch-list-error' &&
        url.pathname === '/stock/api/batch/jobs') ||
      (scenario === 'batch-detail-error' &&
        /^\/stock\/api\/batch\/jobs\/\d+$/.test(url.pathname)) ||
      (scenario === 'trigger-error' &&
        request.method() === 'POST' &&
        url.pathname === '/stock/api/batch/market-daily');

    if (errorScenarioByPath) {
      return route.fulfill({
        status: 503,
        headers: jsonHeaders(),
        body: JSON.stringify({
          detail: 'Mock API intentionally returned an unavailable response.',
        }),
      });
    }

    if (
      scenario === 'batch-detail-loading' &&
      /^\/stock\/api\/batch\/jobs\/\d+$/.test(url.pathname)
    ) {
      await delayed();
    }

    if (
      scenario === 'trigger-pending' &&
      request.method() === 'POST' &&
      url.pathname === '/stock/api/batch/market-daily'
    ) {
      await delayed();
    }

    let data;

    if (url.pathname === '/stock/api/pages/daily/latest') {
      data = dailyPage(
        scenario === 'market-partial'
          ? 'PARTIAL'
          : scenario === 'market-failed-status'
            ? 'FAILED'
            : 'READY',
        { emptyMarkets: scenario === 'market-empty-markets' }
      );
      if (scenario === 'market-long-content') {
        data.globalHeadline =
          '연방준비제도의 정책 경로와 글로벌 공급망 재편, 인공지능 인프라 투자 확대, 원자재 가격 변동이 동시에 반영되면서 미국과 한국 시장의 업종별 방향성이 크게 엇갈린 장세';
        data.markets[0].summaryTitle =
          '매우 긴 시장 요약 제목이 여러 줄로 확장될 때 heading과 구분선, 지표 배지가 좁은 화면에서도 서로 겹치지 않는지 확인하기 위한 스트레스 콘텐츠';
        data.markets[0].summaryBody =
          '이 문장은 일반적인 요약보다 훨씬 긴 분석 문단을 재현합니다. 시장 참여자는 금리, 실적, 환율, 원자재, 지정학적 위험을 동시에 해석해야 하며 각 요인의 영향이 서로 다른 시간대와 업종에서 나타날 수 있습니다. 디자인은 내용의 일부를 조용히 잘라내지 않고도 핵심과 세부 정보를 단계적으로 탐색할 수 있어야 합니다.';
        data.markets[0].topClusters[0].title =
          '공백없는긴오류또는뉴스식별자ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        data.markets[0].topClusters[0].tags = Array.from(
          { length: 20 },
          (_, index) => `매우긴태그이름-${index + 1}-LongMarketTopic`
        );
      }
    } else if (url.pathname === '/stock/api/pages/daily') {
      data = dailyPage(scenario === 'archive-partial' ? 'PARTIAL' : 'READY', {
        businessDate: url.searchParams.get('businessDate') ?? '2026-07-26',
        pageId: 41,
      });
    } else if (/^\/stock\/api\/pages\/\d+$/.test(url.pathname)) {
      data = dailyPage(scenario === 'archive-partial' ? 'PARTIAL' : 'READY', {
        businessDate: '2026-07-26',
        pageId: Number(url.pathname.split('/').at(-1)),
      });
    } else if (url.pathname === '/stock/api/pages/archive') {
      data = archiveList(
        Number(url.searchParams.get('page') ?? 1),
        scenario === 'archive-list-empty'
      );
    } else if (url.pathname.startsWith('/stock/api/news/clusters/')) {
      data = clusterDetail(scenario === 'cluster-sparse');
    } else if (url.pathname === '/stock/api/batch/jobs') {
      data =
        scenario === 'batch-page-2'
          ? batchList(false, 2, 44)
          : batchList(scenario === 'batch-empty');
    } else if (/^\/stock\/api\/batch\/jobs\/\d+$/.test(url.pathname)) {
      const jobId = Number(url.pathname.split('/').at(-1));
      data = batchDetail(jobId);
      if (scenario === 'batch-long-error' && data) {
        data.logSummary =
          'NEWS_SOURCE_TIMEOUT_WITH_A_VERY_LONG_UNBROKEN_IDENTIFIER_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789: 원문 공급자 응답 제한 시간을 초과했습니다. 동일 오류가 여러 수집 단계에서 반복되었으며, 어떤 단계가 실패했고 사용자 snapshot에 어떤 영향을 미쳤는지 긴 로그에서도 읽을 수 있어야 합니다. '.repeat(
            5
          );
      }
    } else if (
      request.method() === 'POST' &&
      url.pathname === '/stock/api/batch/market-daily'
    ) {
      data = {
        jobId: 205,
        jobName: 'market-daily-manual',
        businessDate: '2026-07-27',
        status: 'RUNNING',
        startedAt: '2026-07-27T10:00:00+09:00',
      };
    } else {
      return route.fulfill({
        status: 404,
        headers: jsonHeaders(),
        body: JSON.stringify({
          detail: `Unhandled mock path: ${url.pathname}`,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(envelope(data)),
    });
  });
}

async function capture(
  page,
  {
    filename,
    route,
    waitFor,
    viewport = { width: 1440, height: 1000 },
    colorScheme = 'dark',
    fullPage = true,
    action,
  }
) {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ colorScheme });
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });

  if (waitFor) {
    await page.getByText(waitFor, { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 10000,
    });
  }

  if (action) {
    await action(page);
  }

  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage,
  });

  console.log(`captured ${filename}`);
}

async function captureAppStates(page) {
  const scenarios = [
    {
      filename: '01-latest-ready-dark-desktop.png',
      route: '/stock/market/latest?mock=ready',
      waitFor: '글로벌 시장 요약',
    },
    {
      filename: '02-latest-ready-light-desktop.png',
      route: '/stock/market/latest?mock=ready',
      waitFor: '글로벌 시장 요약',
      colorScheme: 'light',
    },
    {
      filename: '03-latest-partial-desktop.png',
      route: '/stock/market/latest?mock=market-partial',
      waitFor: 'PARTIAL',
    },
    {
      filename: '04-latest-failed-status-desktop.png',
      route: '/stock/market/latest?mock=market-failed-status',
      waitFor: 'FAILED',
    },
    {
      filename: '05-latest-empty-markets-desktop.png',
      route: '/stock/market/latest?mock=market-empty-markets',
      waitFor: '글로벌 시장 요약',
    },
    {
      filename: '06-latest-loading-desktop.png',
      route: '/stock/market/latest?mock=market-loading',
      waitFor: 'Loading Market Data',
    },
    {
      filename: '07-latest-api-error-desktop.png',
      route: '/stock/market/latest?mock=market-error',
      waitFor: 'Market Data Unavailable',
    },
    {
      filename: '08-latest-ready-tablet.png',
      route: '/stock/market/latest?mock=ready',
      waitFor: '글로벌 시장 요약',
      viewport: { width: 1024, height: 900 },
    },
    {
      filename: '09-latest-ready-mobile.png',
      route: '/stock/market/latest?mock=ready',
      waitFor: '글로벌 시장 요약',
      viewport: { width: 390, height: 844 },
    },
    {
      filename: '10-archive-detail-ready-desktop.png',
      route:
        '/stock/market/archive/2026-07-26?pageId=41&mock=archive-detail-ready',
      waitFor: '아카이브 시장 요약',
    },
    {
      filename: '11-archive-detail-partial-desktop.png',
      route: '/stock/market/archive/2026-07-26?mock=archive-partial',
      waitFor: 'PARTIAL',
    },
    {
      filename: '12-archive-detail-loading-desktop.png',
      route:
        '/stock/market/archive/2026-07-26?pageId=41&mock=archive-detail-loading',
      waitFor: 'Loading Market Data',
    },
    {
      filename: '13-archive-detail-error-desktop.png',
      route:
        '/stock/market/archive/2026-07-26?pageId=41&mock=archive-detail-error',
      waitFor: 'Market Data Unavailable',
    },
    {
      filename: '14-archive-search-populated-desktop.png',
      route:
        '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&page=1&mock=archive-list-ready',
      waitFor: '과거 시장 기록 탐색',
    },
    {
      filename: '15-archive-search-page-2-desktop.png',
      route:
        '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&page=2&mock=archive-list-ready',
      waitFor: 'Page 2 / 2',
    },
    {
      filename: '16-archive-search-empty-desktop.png',
      route:
        '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&status=FAILED&page=1&mock=archive-list-empty',
      waitFor: '조회 조건에 맞는 아카이브 결과가 없습니다.',
    },
    {
      filename: '17-archive-search-loading-desktop.png',
      route: '/stock/market/archive/search?mock=archive-list-loading',
      waitFor: 'Loading Archive Data',
    },
    {
      filename: '18-archive-search-error-desktop.png',
      route: '/stock/market/archive/search?mock=archive-list-error',
      waitFor: 'Archive Data Unavailable',
    },
    {
      filename: '19-archive-search-filter-open-desktop.png',
      route:
        '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&mock=archive-list-ready',
      waitFor: '과거 시장 기록 탐색',
      action: async (currentPage) => {
        await currentPage.locator('#archive-status-trigger').click();
        await currentPage
          .getByText('All Status', { exact: true })
          .last()
          .waitFor();
      },
    },
    {
      filename: '20-archive-search-mobile.png',
      route:
        '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&mock=archive-list-ready',
      waitFor: '과거 시장 기록 탐색',
      viewport: { width: 390, height: 844 },
    },
    {
      filename: '21-cluster-detail-ready-desktop.png',
      route: `/stock/market/cluster/${clusterId}?mock=cluster-ready`,
      waitFor: 'AI 심층 분석 리포트',
    },
    {
      filename: '22-cluster-detail-sparse-desktop.png',
      route: `/stock/market/cluster/${clusterId}?mock=cluster-sparse`,
      waitFor: '기사 연결이 완료되지 않은 뉴스 클러스터',
    },
    {
      filename: '23-cluster-detail-loading-desktop.png',
      route: `/stock/market/cluster/${clusterId}?mock=cluster-loading`,
      waitFor: 'Loading Cluster Detail',
    },
    {
      filename: '24-cluster-detail-error-desktop.png',
      route: `/stock/market/cluster/${clusterId}?mock=cluster-error`,
      waitFor: 'Cluster Detail Unavailable',
    },
    {
      filename: '25-cluster-detail-mobile.png',
      route: `/stock/market/cluster/${clusterId}?mock=cluster-ready`,
      waitFor: 'AI 심층 분석 리포트',
      viewport: { width: 390, height: 844 },
    },
    {
      filename: '26-batch-mixed-default-failed-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-ready',
      waitFor: 'NEWS_SOURCE_TIMEOUT',
    },
    {
      filename: '27-batch-selected-success-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-ready',
      waitFor: 'NEWS_SOURCE_TIMEOUT',
      action: async (currentPage) => {
        await currentPage
          .getByRole('button', { name: 'Select batch job 201' })
          .click();
        await currentPage
          .getByText(
            '모든 수집·정규화·클러스터링·페이지 생성 단계가 정상 완료되었습니다.'
          )
          .waitFor();
      },
    },
    {
      filename: '28-batch-empty-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-empty',
      waitFor: '조회 조건에 맞는 배치 이력이 없습니다.',
    },
    {
      filename: '29-batch-list-loading-desktop.png',
      route: '/stock/ops/batches?mock=batch-list-loading',
      waitFor: 'Loading Batch Jobs',
    },
    {
      filename: '30-batch-list-error-desktop.png',
      route: '/stock/ops/batches?mock=batch-list-error',
      waitFor: 'Batch Jobs Unavailable',
    },
    {
      filename: '31-batch-detail-loading-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-detail-loading',
      waitFor: '선택한 배치 상세 정보를 불러오는 중입니다.',
    },
    {
      filename: '32-batch-detail-error-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-detail-error',
      waitFor: 'Mock API intentionally returned an unavailable response.',
    },
    {
      filename: '33-batch-trigger-pending-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=trigger-pending',
      waitFor: 'Batch Operations',
      action: async (currentPage) => {
        await currentPage
          .getByRole('button', { name: 'Manual Trigger' })
          .click();
        await currentPage
          .getByRole('button', { name: 'Triggering...' })
          .waitFor();
      },
    },
    {
      filename: '34-batch-trigger-error-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=trigger-error',
      waitFor: 'Batch Operations',
      action: async (currentPage) => {
        await currentPage
          .getByRole('button', { name: 'Manual Trigger' })
          .click();
        await currentPage
          .getByText('배치 실행 요청에 실패했습니다. 다시 시도해 주세요.')
          .waitFor();
      },
    },
    {
      filename: '35-batch-filter-open-desktop.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-ready',
      waitFor: 'Batch Operations',
      action: async (currentPage) => {
        await currentPage.locator('#ops-status-trigger').click();
        await currentPage
          .getByText('ALL STATUSES', { exact: true })
          .last()
          .waitFor();
      },
    },
    {
      filename: '36-batch-mobile.png',
      route:
        '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-ready',
      waitFor: 'Batch Operations',
      viewport: { width: 390, height: 844 },
    },
    {
      filename: '37-not-found-desktop.png',
      route: '/stock/unknown/path?mock=ready',
      waitFor: 'Route not found',
    },
    {
      filename: '38-auth-loading-desktop.png',
      route: '/stock/market/latest?mock=auth-loading',
      waitFor: '로그인 상태를 확인하고 있습니다',
    },
  ];

  for (const scenario of scenarios) {
    await capture(page, scenario);
  }
}

async function captureProductionAuthStates(page) {
  await capture(page, {
    filename: '39-auth-production-loading-desktop.png',
    route: '/stock/market/latest?mock=auth-loading',
    waitFor: '로그인 상태를 확인하고 있습니다',
  });
  await capture(page, {
    filename: '40-auth-production-redirecting-desktop.png',
    route: '/stock/market/latest?mock=auth-redirecting',
    waitFor: '로그인 페이지로 이동 중입니다',
  });
}

async function captureConfigFailure(page) {
  await capture(page, {
    filename: '41-auth-config-failed-desktop.png',
    route: '/stock/market/latest',
    waitFor: '로그인 상태를 확인할 수 없습니다',
  });
}

async function captureMobileOverflowViewports(page) {
  await capture(page, {
    filename: '42-archive-search-mobile-viewport.png',
    route:
      '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&mock=archive-list-ready',
    waitFor: '과거 시장 기록 탐색',
    viewport: { width: 390, height: 844 },
    fullPage: false,
  });
  await capture(page, {
    filename: '43-batch-mobile-viewport.png',
    route: '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-ready',
    waitFor: 'Batch Operations',
    viewport: { width: 390, height: 844 },
    fullPage: false,
  });
}

async function captureAuditEvidence(page) {
  await capture(page, {
    filename: '44-skip-link-focus-desktop.png',
    route: '/stock/market/latest?mock=ready',
    waitFor: '글로벌 시장 요약',
    fullPage: false,
    action: async (currentPage) => {
      await currentPage.locator('.skip-link').focus();
    },
  });
  await capture(page, {
    filename: '45-archive-search-focus-visible-desktop.png',
    route:
      '/stock/market/archive/search?from=2026-07-20&to=2026-07-27&mock=archive-list-ready',
    waitFor: '과거 시장 기록 탐색',
    fullPage: false,
    action: async (currentPage) => {
      await currentPage.getByRole('button', { name: 'Search' }).focus();
    },
  });
  await capture(page, {
    filename: '46-latest-320px-viewport.png',
    route: '/stock/market/latest?mock=ready',
    waitFor: '글로벌 시장 요약',
    viewport: { width: 320, height: 568 },
    fullPage: false,
  });
  await capture(page, {
    filename: '47-latest-long-content-mobile.png',
    route: '/stock/market/latest?mock=market-long-content',
    waitFor: '공백없는긴오류또는뉴스식별자',
    viewport: { width: 390, height: 844 },
  });
  await capture(page, {
    filename: '48-batch-long-error-desktop.png',
    route:
      '/stock/ops/batches?from=2026-07-20&to=2026-07-27&mock=batch-long-error',
    waitFor: 'NEWS_SOURCE_TIMEOUT_WITH_A_VERY_LONG_UNBROKEN_IDENTIFIER',
  });
  await capture(page, {
    filename: '49-latest-partial-light-desktop.png',
    route: '/stock/market/latest?mock=market-partial',
    waitFor: 'PARTIAL',
    colorScheme: 'light',
  });
  await capture(page, {
    filename: '50-batch-page-2-without-controls-desktop.png',
    route:
      '/stock/ops/batches?from=2026-07-20&to=2026-07-27&page=2&mock=batch-page-2',
    waitFor: 'Showing 4 of 44 batch jobs',
  });
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: 'dark',
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  if (captureMode !== 'auth-config-error') {
    await installMockApi(page);
  }

  try {
    if (captureMode === 'app') {
      await captureAppStates(page);
    } else if (captureMode === 'auth-production') {
      await captureProductionAuthStates(page);
    } else if (captureMode === 'auth-config-error') {
      await captureConfigFailure(page);
    } else if (captureMode === 'mobile-overflow') {
      await captureMobileOverflowViewports(page);
    } else if (captureMode === 'audit-evidence') {
      await captureAuditEvidence(page);
    } else {
      throw new Error(`Unknown CAPTURE_MODE: ${captureMode}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
