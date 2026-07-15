import { describe, expect, it } from 'vitest';

import {
  mapArchiveListToView,
  mapBatchDetailToRun,
  mapBatchJobsToView,
  mapClusterDetailToView,
  mapDailyPageToSnapshot,
} from './mappers';
import type { ClusterDetailResponse } from './api/types';

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
    expect(snapshot.markets[0].indices[0].direction).toBe('up');
    expect(snapshot.markets[0].clusters[0].id).toBe('cluster-1');
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
