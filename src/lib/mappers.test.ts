import { describe, expect, it } from 'vitest';
import type { ClusterDetailResponse, DailyPageResponse } from './api/types';
import {
  mapArchiveListToView,
  mapBatchDetailToRun,
  mapBatchJobsToView,
  mapClusterDetailToView,
  mapDailyPageToSnapshot,
} from './mappers';

describe('mappers', () => {
  it('maps a daily page response into the market snapshot view model', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [
            {
              indexCode: 'IX',
              indexName: 'NASDAQ',
              closePrice: '16274.94',
              changeValue: '120.33',
              changePercent: '0.74',
              highPrice: '16302.11',
              lowPrice: '16180.45',
            },
          ],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: 'cluster summary',
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {},
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    });

    expect(snapshot.status).toBe('ready');
    expect(snapshot.globalHeadline).toBe('headline');
    expect(snapshot.markets[0].summaryTitle).toBe('요약 제목');
    expect(snapshot.markets[0].summaryBody).toBe('요약 본문');
    expect(snapshot.markets[0].indices[0].direction).toBe('up');
    expect(snapshot.markets[0].clusters[0].id).toBe('cluster-1');
    expect(snapshot.markets[0].clusters[0].title).toBe('cluster title');
    expect(snapshot.markets[0].clusters[0].summary).toBe('cluster summary');
  });

  it.each([
    null,
    undefined,
    123,
    { state: 'READY' },
  ])('falls back to a conservative status tone when daily page status is malformed (%p)', (status) => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status,
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [],
    } as unknown as DailyPageResponse);

    expect(snapshot.status).toBe('failed');
  });

  it('defensively maps missing daily page market arrays from external DTOs', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
    } as unknown as DailyPageResponse;

    expect(() => mapDailyPageToSnapshot(malformedResponse)).not.toThrow();

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.globalHeadline).toBe('Latest');
    expect(snapshot.markets).toEqual([]);
  });

  it('defensively maps malformed daily page nested generated DTOs', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: null,
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: null,
          summaryBody: null,
          analysis: {
            background: 'not an array',
            keyThemes: { theme: 'AI' },
            outlook: null,
          },
          indices: { indexName: 'NASDAQ' },
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: null,
              articleCount: 3,
              tags: 'AI',
              representativeArticle: 'not an object',
            },
            'not a cluster',
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
        'not a market',
      ],
    } as unknown as DailyPageResponse;

    expect(() => mapDailyPageToSnapshot(malformedResponse)).not.toThrow();

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.globalHeadline).toBe('글로벌 시장 헤드라인이 없습니다.');
    expect(snapshot.markets).toHaveLength(1);
    expect(snapshot.markets[0].summaryTitle).toBe('미국 증시 요약');
    expect(snapshot.markets[0].summaryBody).toBe(
      '시장 요약 데이터가 아직 생성되지 않았습니다.'
    );
    expect(snapshot.markets[0].indices).toEqual([]);
    expect(snapshot.markets[0].clusters).toEqual([
      {
        id: 'cluster-1',
        articleCount: 3,
        title: 'cluster title',
        summary: '클러스터 요약이 아직 생성되지 않았습니다.',
        tags: [],
      },
    ]);
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])('falls back to zero when daily cluster articleCount is non-finite (%p)', (articleCount) => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: 'cluster summary',
              articleCount,
              tags: [],
              representativeArticle: {},
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse);

    expect(snapshot.markets[0].clusters[0].articleCount).toBe(0);
  });

  it.each([
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('falls back to zero when daily cluster articleCount is not a nonnegative safe integer (%p)', (articleCount) => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: 'cluster summary',
              articleCount,
              tags: [],
              representativeArticle: {},
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse);

    expect(snapshot.markets[0].clusters[0].articleCount).toBe(0);
  });

  it('falls back to articles length when cluster articleCount is malformed', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketLabel: '미국',
      title: 'cluster title',
      tags: [],
      analysis: ['analysis paragraph'],
      articles: [
        {
          processedArticleId: 'article-1',
          publisherName: 'Source 1',
          publishedAt: '2026-03-31T06:12:00Z',
          title: 'article 1',
          originLink: 'https://example.com/1',
          naverLink: 'https://example.com/1-mirror',
        },
        {
          processedArticleId: 'article-2',
          publisherName: 'Source 2',
          publishedAt: '2026-03-31T06:13:00Z',
          title: 'article 2',
          originLink: 'https://example.com/2',
          naverLink: 'https://example.com/2-mirror',
        },
      ],
      representativeArticle: {
        processedArticleId: 'rep',
        publisherName: 'Representative Source',
        publishedAt: '2026-03-31T06:14:00Z',
        title: 'representative article',
        originLink: 'https://example.com/rep',
        naverLink: 'https://example.com/rep-mirror',
      },
      articleCount: 'not-a-number',
      updatedAt: '2026-03-31T06:15:00Z',
    } as unknown as ClusterDetailResponse);

    expect(detail.articleCount).toBe(2);
  });

  it.each([
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    null,
  ])('falls back to articles length when cluster articleCount is not a nonnegative safe integer (%p)', (articleCount) => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketLabel: '미국',
      title: 'cluster title',
      tags: [],
      analysis: ['analysis paragraph'],
      articles: [
        {
          processedArticleId: 'article-1',
          publisherName: 'Source 1',
          publishedAt: '2026-03-31T06:12:00Z',
          title: 'article 1',
          originLink: 'https://example.com/1',
          naverLink: 'https://example.com/1-mirror',
        },
        {
          processedArticleId: 'article-2',
          publisherName: 'Source 2',
          publishedAt: '2026-03-31T06:13:00Z',
          title: 'article 2',
          originLink: 'https://example.com/2',
          naverLink: 'https://example.com/2-mirror',
        },
      ],
      representativeArticle: {
        processedArticleId: 'rep',
        publisherName: 'Representative Source',
        publishedAt: '2026-03-31T06:14:00Z',
        title: 'representative article',
        originLink: 'https://example.com/rep',
        naverLink: 'https://example.com/rep-mirror',
      },
      articleCount,
      updatedAt: '2026-03-31T06:15:00Z',
    } as unknown as ClusterDetailResponse);

    expect(detail.articleCount).toBe(2);
  });

  it('falls back to safe strings for non-string daily page text fields', () => {
    const malformedResponse = {
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: { text: 'Latest' },
      status: 'READY',
      globalHeadline: 123,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: { text: '요약 제목' },
          summaryBody: 456,
          analysis: {
            background: [{ text: '배경' }, 789, null],
            keyThemes: [321, { text: 'AI' }],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: { text: 'cluster title' },
              summary: { text: 'cluster summary' },
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {
                title: 987,
              },
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse;

    const snapshot = mapDailyPageToSnapshot(malformedResponse);

    expect(snapshot.globalHeadline).toBe('글로벌 시장 헤드라인이 없습니다.');
    expect(snapshot.markets[0].summaryTitle).toBe('미국 증시 요약');
    expect(snapshot.markets[0].summaryBody).toBe(
      '시장 요약 데이터가 아직 생성되지 않았습니다.'
    );
    expect(snapshot.markets[0].clusters[0].title).toBe(
      '클러스터 제목이 없습니다.'
    );
    expect(snapshot.markets[0].clusters[0].summary).toBe(
      '클러스터 요약이 아직 생성되지 않았습니다.'
    );
  });

  it('keeps index labels and numeric fields safe when daily index DTO values are objects', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: '요약 제목',
          summaryBody: '요약 본문',
          analysis: {
            background: [],
            keyThemes: [],
            outlook: null,
          },
          indices: [
            {
              indexCode: 'IX',
              indexName: { text: 'NASDAQ' },
              closePrice: { value: '16274.94' },
              changeValue: { value: '120.33' },
              changePercent: { value: '0.74' },
              highPrice: { value: '16302.11' },
              lowPrice: { value: '16180.45' },
            },
          ],
          topClusters: [],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    } as unknown as DailyPageResponse);

    expect(snapshot.markets[0].indices[0]).toEqual({
      label: '-',
      value: '-',
      change: '-',
      changeRate: '-',
      direction: 'down',
      high: '-',
      low: '-',
    });
  });

  it('falls back to a safe daily business date when the DTO value is not a string', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: { date: '2026-03-31' },
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: 'headline',
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [],
    } as unknown as DailyPageResponse);

    expect(snapshot.businessDate).toBe('-');
  });

  it('uses a valid representative article title as the daily cluster summary fallback', () => {
    const snapshot = mapDailyPageToSnapshot({
      pageId: 1,
      businessDate: '2026-03-31',
      versionNo: 2,
      pageTitle: 'Latest',
      status: 'READY',
      globalHeadline: null,
      generatedAt: '2026-03-31T06:12:00Z',
      partialMessage: null,
      metadata: {
        rawNewsCount: 1,
        processedNewsCount: 1,
        clusterCount: 1,
        lastUpdatedAt: '2026-03-31T06:12:00Z',
      },
      markets: [
        {
          marketType: 'US',
          marketLabel: '미국 증시',
          summaryTitle: null,
          summaryBody: null,
          analysis: {
            background: ['배경'],
            keyThemes: ['AI'],
            outlook: null,
          },
          indices: [],
          topClusters: [
            {
              clusterId: 'cluster-1',
              title: 'cluster title',
              summary: null,
              articleCount: 3,
              tags: ['AI'],
              representativeArticle: {
                title: 'representative article title',
              },
            },
          ],
          articleLinks: [],
          metadata: {
            rawNewsCount: 1,
            processedNewsCount: 1,
            clusterCount: 1,
            lastUpdatedAt: '2026-03-31T06:12:00Z',
            partialMessage: null,
          },
        },
      ],
    });

    expect(snapshot.globalHeadline).toBe('Latest');
    expect(snapshot.markets[0].summaryTitle).toBe('AI');
    expect(snapshot.markets[0].summaryBody).toBe('배경');
    expect(snapshot.markets[0].clusters[0].summary).toBe(
      'representative article title'
    );
  });

  it('maps archive pagination into table rows', () => {
    const view = mapArchiveListToView({
      items: [
        {
          pageId: 1,
          businessDate: '2026-03-31',
          pageTitle: 'Title',
          headlineSummary: null,
          status: 'READY',
          generatedAt: '2026-03-31T06:12:00Z',
          partialMessage: null,
        },
      ],
      pagination: {
        page: 2,
        size: 10,
        totalCount: 21,
      },
    });

    expect(view.page).toBe(2);
    expect(view.totalPages).toBe(3);
    expect(view.rows[0].headline).toBe('Title');
  });

  it('normalizes malformed archive item dates, text, status, and counts', () => {
    const view = mapArchiveListToView({
      items: [
        {
          pageId: { id: 1 },
          businessDate: { date: '2026-03-31' },
          pageTitle: { text: 'Title' },
          headlineSummary: { text: 'Headline' },
          status: { value: 'READY' },
          generatedAt: { iso: '2026-03-31T06:12:00Z' },
          partialMessage: { text: 'partial' },
        },
      ],
      pagination: {
        page: { value: 2 },
        size: { value: 10 },
        totalCount: { value: 21 },
      },
    } as unknown as Parameters<typeof mapArchiveListToView>[0]);

    expect(view).toMatchObject({
      page: 1,
      size: 1,
      totalCount: 0,
      totalPages: 1,
    });
    expect(view.rows[0]).toMatchObject({
      pageId: 0,
      businessDate: '-',
      headline: '헤드라인 요약이 아직 생성되지 않았습니다.',
      status: 'FAILED',
      generatedAt: '-',
      detail: null,
    });
  });

  it('maps cluster detail response', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: ['AI'],
      summary: {
        analysis: ['one'],
      },
      representativeArticle: {
        title: 'rep',
        originLink: 'https://example.com',
      },
      articles: [
        {
          processedArticleId: 1,
          title: 'article',
          originLink: 'https://example.com',
        },
      ],
      lastUpdatedAt: '2026-03-31T06:12:00Z',
      articleCount: null,
    });

    expect(detail.analysis).toEqual(['one']);
    expect(detail.articleCount).toBe(1);
  });

  it('defensively maps malformed cluster detail arrays from external DTOs', () => {
    const malformedResponse = {
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: 'AI',
      summary: {
        short: 'fallback summary',
        analysis: 'not an array',
      },
      representativeArticle: {
        title: 'rep',
        originLink: 'https://example.com',
      },
      articles: 'not an array',
      lastUpdatedAt: '2026-03-31T06:12:00Z',
      articleCount: null,
    } as unknown as ClusterDetailResponse;

    expect(() => mapClusterDetailToView(malformedResponse)).not.toThrow();

    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.tags).toEqual([]);
    expect(detail.analysis).toEqual([]);
    expect(detail.articles).toEqual([]);
    expect(detail.articleCount).toBe(0);
  });

  it('normalizes malformed cluster detail text, dates, and links to safe display values', () => {
    const malformedResponse = {
      clusterId: { id: 'cluster-1' },
      businessDate: { date: '2026-03-31' },
      marketType: 'US',
      marketLabel: { label: '미국' },
      title: { text: 'cluster title' },
      tags: ['AI', { tag: 'bad' }],
      summary: {
        short: { text: 'fallback summary' },
        analysis: ['one', { paragraph: 'bad' }],
      },
      representativeArticle: {
        processedArticleId: { id: 1 },
        publisherName: { name: 'publisher' },
        publishedAt: { iso: '2026-03-31T06:12:00Z' },
        title: { text: 'rep' },
        originLink: { href: 'https://example.com' },
        naverLink: { href: 'https://naver.example.com' },
        sourceSummary: { text: 'summary' },
      },
      articles: [
        {
          processedArticleId: 1,
          publisherName: { name: 'publisher' },
          publishedAt: 'not a real date',
          title: { text: 'article' },
          originLink: { href: 'https://example.com/original' },
          naverLink: { href: 'https://example.com/mirror' },
        },
      ],
      lastUpdatedAt: { iso: '2026-03-31T06:12:00Z' },
      articleCount: null,
    } as unknown as ClusterDetailResponse;

    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.id).toBe('unknown-cluster');
    expect(detail.businessDate).toBe('-');
    expect(detail.marketLabel).toBe('시장');
    expect(detail.title).toBe('클러스터 제목이 없습니다.');
    expect(detail.analysis).toEqual(['one']);
    expect(detail.updatedAt).toBe('-');
    expect(detail.representative).toMatchObject({
      id: 'representative-unknown-cluster',
      source: 'Unknown Source',
      publishedAt: '-',
      title: '기사 제목이 없습니다.',
      originalUrl: '',
      mirrorUrl: '',
      sourceSummary: '대표 기사 요약이 아직 생성되지 않았습니다.',
    });
    expect(detail.articles[0]).toMatchObject({
      id: '1',
      source: 'Unknown Source',
      publishedAt: '-',
      title: '기사 제목이 없습니다.',
      originalUrl: '',
      mirrorUrl: '',
    });
  });

  it('keeps valid cluster detail DTO text, dates, and links unchanged', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: ['AI'],
      summary: {
        short: 'summary',
        analysis: ['one'],
      },
      representativeArticle: {
        processedArticleId: 7,
        publisherName: 'Publisher',
        publishedAt: '2026-03-31T06:12:00Z',
        title: 'rep',
        originLink: 'https://example.com',
        naverLink: 'https://naver.example.com',
        sourceSummary: 'source summary',
      },
      articles: [
        {
          processedArticleId: 1,
          publisherName: 'Publisher',
          publishedAt: '2026-03-31T06:13:00Z',
          title: 'article',
          originLink: 'https://example.com/original',
          naverLink: 'https://example.com/mirror',
        },
      ],
      lastUpdatedAt: '2026-03-31T06:14:00Z',
      articleCount: 1,
    });

    expect(detail.id).toBe('cluster-1');
    expect(detail.businessDate).toBe('2026-03-31');
    expect(detail.marketLabel).toBe('미국');
    expect(detail.title).toBe('cluster title');
    expect(detail.representative).toMatchObject({
      id: '7',
      source: 'Publisher',
      title: 'rep',
      originalUrl: 'https://example.com',
      mirrorUrl: 'https://naver.example.com',
      sourceSummary: 'source summary',
    });
    expect(detail.articles[0]).toMatchObject({
      id: '1',
      source: 'Publisher',
      title: 'article',
      originalUrl: 'https://example.com/original',
      mirrorUrl: 'https://example.com/mirror',
    });
    expect(detail.representative.publishedAt).not.toBe('-');
    expect(detail.articles[0].publishedAt).not.toBe('-');
    expect(detail.updatedAt).not.toBe('-');
  });

  it('falls back instead of calling string methods on malformed status DTO values', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: { value: 'SUCCESS' },
          startedAt: '2026-03-31T06:12:00Z',
          endedAt: null,
          durationSeconds: null,
          marketScope: 'US Market',
          rawNewsCount: 77,
          processedNewsCount: 32,
          clusterCount: 9,
          pageId: 1,
          pageVersionNo: null,
          partialMessage: null,
        },
      ],
      pagination: {
        page: 1,
        size: 20,
        totalCount: 1,
      },
      summary: {
        successCount: 0,
        partialCount: 0,
        failedCount: 1,
        avgDurationSeconds: 0,
      },
    } as unknown as Parameters<typeof mapBatchJobsToView>[0]);

    const detail = mapBatchDetailToRun({
      jobId: 1,
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: { value: 'FAILED' },
      forceRun: false,
      rebuildPageOnly: false,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: null,
      durationSeconds: null,
      rawNewsCount: 77,
      processedNewsCount: 32,
      clusterCount: 9,
      pageId: 1,
      pageVersionNo: null,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: null,
    } as unknown as Parameters<typeof mapBatchDetailToRun>[0]);

    expect(jobsView.rows[0].status).toBe('FAILED');
    expect(detail.status).toBe('FAILED');
  });

  it('normalizes malformed batch run text, count, and detail fields', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: { id: 1 },
          jobName: { text: 'daily' },
          businessDate: { date: '2026-03-31' },
          status: { value: 'SUCCESS' },
          startedAt: { iso: '2026-03-31T06:12:00Z' },
          endedAt: { iso: '2026-03-31T06:26:11Z' },
          durationSeconds: { seconds: 851 },
          marketScope: { market: 'US Market' },
          rawNewsCount: { count: 77 },
          processedNewsCount: { count: 32 },
          clusterCount: { count: 9 },
          pageId: { id: 1 },
          pageVersionNo: { version: 2 },
          partialMessage: { text: 'partial' },
        },
      ],
      pagination: {
        page: { value: 1 },
        size: { value: 20 },
        totalCount: { value: 1 },
      },
      summary: {
        successCount: { count: 1 },
        partialCount: { count: 0 },
        failedCount: { count: 0 },
        avgDurationSeconds: { seconds: 851 },
      },
    } as unknown as Parameters<typeof mapBatchJobsToView>[0]);

    const detail = mapBatchDetailToRun({
      jobId: { id: 1 },
      jobName: { text: 'daily' },
      businessDate: { date: '2026-03-31' },
      status: { value: 'FAILED' },
      forceRun: false,
      rebuildPageOnly: false,
      startedAt: { iso: '2026-03-31T06:12:00Z' },
      endedAt: { iso: '2026-03-31T06:26:11Z' },
      durationSeconds: { seconds: 851 },
      rawNewsCount: { count: 77 },
      processedNewsCount: { count: 32 },
      clusterCount: { count: 9 },
      pageId: { id: 1 },
      pageVersionNo: { version: 2 },
      partialMessage: { text: 'partial' },
      errorCode: { code: 'X' },
      errorMessage: { text: 'failure' },
      logSummary: { text: 'log' },
    } as unknown as Parameters<typeof mapBatchDetailToRun>[0]);

    expect(jobsView).toMatchObject({
      page: 1,
      size: 1,
      totalCount: 0,
      totalPages: 1,
      summary: {
        successRate: '0.0%',
        avgProcessingTime: '-',
        marketSyncQuality: 'Stable',
        successSupporting: '0 success / 0 failed',
        durationSupporting: 'Average across 0 runs',
      },
    });
    expect(jobsView.rows[0]).toMatchObject({
      id: 0,
      jobName: 'batch',
      market: 'N/A',
      businessDate: '-',
      status: 'FAILED',
      startedAt: '-',
      finishedAt: '-',
      duration: '-',
      counts: '0 / 0 / 0',
      detail: 'batch 배치가 FAILED 상태로 기록되었습니다.',
      pageVersion: '-',
    });
    expect(detail).toMatchObject({
      id: 0,
      jobName: 'batch',
      market: 'N/A',
      businessDate: '-',
      status: 'FAILED',
      startedAt: '-',
      finishedAt: '-',
      duration: '-',
      counts: '0 / 0 / 0',
      detail: 'batch 배치 상세 메시지가 없습니다.',
      pageVersion: '-',
    });
  });

  it('maps batch list and detail responses', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: 'SUCCESS',
          startedAt: '2026-03-31T06:12:00Z',
          endedAt: '2026-03-31T06:26:11Z',
          durationSeconds: 851,
          marketScope: 'US Market',
          rawNewsCount: 77,
          processedNewsCount: 32,
          clusterCount: 9,
          pageId: 1,
          pageVersionNo: 2,
          partialMessage: null,
        },
      ],
      pagination: {
        page: 1,
        size: 20,
        totalCount: 1,
      },
      summary: {
        successCount: 1,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 851,
      },
    });

    const detail = mapBatchDetailToRun({
      jobId: 1,
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: 'FAILED',
      forceRun: false,
      rebuildPageOnly: false,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: '2026-03-31T06:26:11Z',
      durationSeconds: 851,
      rawNewsCount: 77,
      processedNewsCount: 32,
      clusterCount: 9,
      pageId: 1,
      pageVersionNo: 2,
      partialMessage: null,
      errorCode: 'X',
      errorMessage: 'failure',
      logSummary: null,
    });

    expect(jobsView.summary.successRate).toBe('100.0%');
    expect(detail.detail).toBe('failure');
  });
});
