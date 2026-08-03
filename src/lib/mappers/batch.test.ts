import { describe, expect, it } from 'vitest';
import { mapBatchDetailToRun, mapBatchJobsToView } from './batch';

describe('mappers - batch', () => {
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

describe('restored batch detail fields (README §13)', () => {
  const LONG_LOG = 'x'.repeat(4000);

  it('maps errorCode, errorMessage, logSummary, forceRun, and rebuildPageOnly from the batch detail response', () => {
    const detail = mapBatchDetailToRun({
      jobId: 999,
      jobName: 'market_daily_batch',
      businessDate: '2026-07-21',
      status: 'FAILED',
      forceRun: true,
      rebuildPageOnly: false,
      startedAt: '2026-07-22T06:10:00',
      endedAt: '2026-07-22T06:11:09',
      durationSeconds: 69,
      rawNewsCount: 21,
      processedNewsCount: 0,
      clusterCount: 0,
      pageId: null,
      pageVersionNo: null,
      partialMessage: null,
      errorCode: 'NEWS_SOURCE_TIMEOUT',
      errorMessage: '원문 공급자 응답 제한 시간을 초과했습니다.',
      logSummary: LONG_LOG,
    });

    expect(detail.errorCode).toBe('NEWS_SOURCE_TIMEOUT');
    expect(detail.errorMessage).toBe(
      '원문 공급자 응답 제한 시간을 초과했습니다.'
    );
    expect(detail.logSummary).toHaveLength(4000);
    expect(detail.forceRun).toBe(true);
    expect(detail.rebuildPageOnly).toBe(false);
  });

  it('sets errorCode/errorMessage/logSummary/forceRun/rebuildPageOnly to null for batch LIST rows (the list DTO has no such fields)', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1042,
          jobName: 'market_daily_batch',
          businessDate: '2026-07-26',
          status: 'SUCCESS',
          startedAt: '2026-07-27T06:10:00',
          endedAt: '2026-07-27T06:12:15',
          durationSeconds: 135,
          marketScope: 'GLOBAL',
          rawNewsCount: 174,
          processedNewsCount: 114,
          clusterCount: 21,
          pageId: 501,
          pageVersionNo: 3,
          partialMessage: null,
        },
      ],
      pagination: { page: 1, size: 20, totalCount: 1 },
      summary: {
        successCount: 1,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 135,
      },
    });

    expect(jobsView.rows[0]).toMatchObject({
      errorCode: null,
      errorMessage: null,
      logSummary: null,
      forceRun: null,
      rebuildPageOnly: null,
    });
  });

  it('falls back to null when forceRun/rebuildPageOnly are malformed (non-boolean)', () => {
    const detail = mapBatchDetailToRun({
      jobId: 1,
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: 'FAILED',
      forceRun: 'yes',
      rebuildPageOnly: 1,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: null,
      durationSeconds: null,
      rawNewsCount: 0,
      processedNewsCount: 0,
      clusterCount: 0,
      pageId: null,
      pageVersionNo: null,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: null,
    } as unknown as Parameters<typeof mapBatchDetailToRun>[0]);

    expect(detail.forceRun).toBeNull();
    expect(detail.rebuildPageOnly).toBeNull();
  });
});
