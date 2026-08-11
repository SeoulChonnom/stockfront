import { describe, expect, it } from 'vitest';
import { mapBatchDetailToRun, mapBatchJobsToView } from './batch';

describe('mappers - batch', () => {
  it('falls back instead of calling string methods on malformed status DTO values', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobType: 'MARKET_SNAPSHOT',
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: { value: 'SUCCESS' },
          currentStep: '작업 종료',
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
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: { value: 'FAILED' },
      currentStep: null,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: null,
      durationSeconds: null,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: null,
      snapshot: {
        forceRun: false,
        rebuildPageOnly: false,
        rawNewsCount: 77,
        processedNewsCount: 32,
        clusterCount: 9,
        pageId: 1,
        pageVersionNo: null,
      },
      newsCollection: null,
    } as unknown as Parameters<typeof mapBatchDetailToRun>[0]);

    expect(jobsView.rows[0].status).toBe('FAILED');
    expect(detail.status).toBe('FAILED');
  });

  it('normalizes malformed batch run text, count, and detail fields', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: { id: 1 },
          jobType: { value: 'MARKET_SNAPSHOT' },
          jobName: { text: 'daily' },
          businessDate: { date: '2026-03-31' },
          status: { value: 'SUCCESS' },
          currentStep: { value: '작업 종료' },
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
      jobType: { value: 'MARKET_SNAPSHOT' },
      jobName: { text: 'daily' },
      businessDate: { date: '2026-03-31' },
      status: { value: 'FAILED' },
      currentStep: { value: 'x' },
      startedAt: { iso: '2026-03-31T06:12:00Z' },
      endedAt: { iso: '2026-03-31T06:26:11Z' },
      durationSeconds: { seconds: 851 },
      partialMessage: { text: 'partial' },
      errorCode: { code: 'X' },
      errorMessage: { text: 'failure' },
      logSummary: { text: 'log' },
      snapshot: {
        rawNewsCount: { count: 77 },
        processedNewsCount: { count: 32 },
        clusterCount: { count: 9 },
        pageId: { id: 1 },
        pageVersionNo: { version: 2 },
      },
      newsCollection: null,
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
      jobType: '',
      currentStep: null,
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
      jobType: '',
      currentStep: null,
      market: 'N/A',
      businessDate: '-',
      status: 'FAILED',
      startedAt: '-',
      finishedAt: '-',
      duration: '-',
      // snapshot 안 필드도 malformed면 같은 방식으로 fallback한다 —
      // 최상위 필드가 malformed일 때와 동일한 '0 / 0 / 0'.
      counts: '0 / 0 / 0',
      detail: 'batch 배치 상세 메시지가 없습니다.',
      pageVersion: '-',
    });
  });

  it('maps batch list and detail responses, including jobType/currentStep', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobType: 'NEWS_COLLECTION',
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: 'SUCCESS',
          currentStep: '작업 종료',
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
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: 'FAILED',
      currentStep: null,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: '2026-03-31T06:26:11Z',
      durationSeconds: 851,
      partialMessage: null,
      errorCode: 'X',
      errorMessage: 'failure',
      logSummary: null,
      snapshot: {
        forceRun: false,
        rebuildPageOnly: false,
        rawNewsCount: 77,
        processedNewsCount: 32,
        clusterCount: 9,
        pageId: 1,
        pageVersionNo: 2,
      },
      newsCollection: null,
      steps: [],
    });

    expect(jobsView.summary.successRate).toBe('100.0%');
    expect(jobsView.rows[0].jobType).toBe('NEWS_COLLECTION');
    expect(jobsView.rows[0].currentStep).toBe('작업 종료');
    expect(detail.detail).toBe('failure');
    expect(detail.jobType).toBe('MARKET_SNAPSHOT');
  });
});

describe('restored batch detail fields', () => {
  const LONG_LOG = 'x'.repeat(4000);

  it('maps errorCode, errorMessage, logSummary, forceRun, and rebuildPageOnly from the batch detail response', () => {
    const detail = mapBatchDetailToRun({
      jobId: 999,
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'market_daily_batch',
      businessDate: '2026-07-21',
      status: 'FAILED',
      currentStep: null,
      startedAt: '2026-07-22T06:10:00',
      endedAt: '2026-07-22T06:11:09',
      durationSeconds: 69,
      partialMessage: null,
      errorCode: 'NEWS_SOURCE_TIMEOUT',
      errorMessage: '원문 공급자 응답 제한 시간을 초과했습니다.',
      logSummary: LONG_LOG,
      snapshot: {
        forceRun: true,
        rebuildPageOnly: false,
        rawNewsCount: 21,
        processedNewsCount: 0,
        clusterCount: 0,
        pageId: null,
        pageVersionNo: null,
      },
      newsCollection: null,
      steps: [],
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
          jobType: 'MARKET_SNAPSHOT',
          jobName: 'market_daily_batch',
          businessDate: '2026-07-26',
          status: 'SUCCESS',
          currentStep: '작업 종료',
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
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'daily',
      businessDate: '2026-03-31',
      status: 'FAILED',
      currentStep: null,
      startedAt: '2026-03-31T06:12:00Z',
      endedAt: null,
      durationSeconds: null,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: null,
      snapshot: {
        forceRun: 'yes',
        rebuildPageOnly: 1,
        rawNewsCount: 0,
        processedNewsCount: 0,
        clusterCount: 0,
        pageId: null,
        pageVersionNo: null,
      },
      newsCollection: null,
    } as unknown as Parameters<typeof mapBatchDetailToRun>[0]);

    expect(detail.forceRun).toBeNull();
    expect(detail.rebuildPageOnly).toBeNull();
  });
});

describe('mapBatchDetailToRun — jobType-split detail DTO (docs/api_spec.json)', () => {
  it('reads counts/pageVersion/pageId/forceRun/rebuildPageOnly from the nested `snapshot` object for a MARKET_SNAPSHOT job (highest-severity fix)', () => {
    const detail = mapBatchDetailToRun({
      jobId: 1042,
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'market_snapshot_batch',
      businessDate: '2026-07-26',
      status: 'SUCCESS',
      currentStep: '작업 종료',
      startedAt: '2026-07-27T07:10:00',
      endedAt: '2026-07-27T07:11:36',
      durationSeconds: 96,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: '정상 처리.',
      snapshot: {
        forceRun: true,
        rebuildPageOnly: false,
        rawNewsCount: 174,
        processedNewsCount: 114,
        clusterCount: 21,
        pageId: 501,
        pageVersionNo: 3,
      },
      newsCollection: null,
      steps: [],
    });

    // Before this fix, the mapper read these 7 fields off the response's
    // TOP LEVEL (which no longer has them per the real spec) and always
    // produced 0/0/0, '-', force=false — regardless of the real snapshot.
    expect(detail.counts).toBe('174 / 114 / 21');
    expect(detail.pageVersion).toBe('v3');
    expect(detail.pageId).toBe(501);
    expect(detail.forceRun).toBe(true);
    expect(detail.rebuildPageOnly).toBe(false);
  });

  it('does not fabricate 0/0/0 or force=false when `snapshot` is null (a NEWS_COLLECTION job never produces one)', () => {
    const detail = mapBatchDetailToRun({
      jobId: 1041,
      jobType: 'NEWS_COLLECTION',
      jobName: 'news_collection_batch',
      businessDate: '2026-07-26',
      status: 'SUCCESS',
      currentStep: '작업 종료',
      startedAt: '2026-07-27T06:10:00',
      endedAt: '2026-07-27T06:12:32',
      durationSeconds: 152,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: '정상 처리.',
      snapshot: null,
      newsCollection: {
        runId: 1041,
        providerName: 'naver',
        windowStartAt: '2026-07-27T06:10:00',
        windowEndAt: '2026-07-27T06:12:32',
        queryStartAt: '2026-07-27T06:10:00',
        queryEndAt: '2026-07-27T06:12:32',
        totalKeywordCount: 40,
        completedKeywordCount: 40,
        fetchedCount: 174,
        matchedCount: 114,
        insertedCount: 114,
        coverageComplete: true,
      },
      steps: [],
    });

    // The mapper still falls back to '0 / 0 / 0'/'-'/null/false (the coerce
    // helpers' documented behavior for a missing value) — the point of this
    // test is that `jobType` is threaded through so the DETAIL PANEL (not
    // this mapper) can tell a NEWS_COLLECTION job apart from a
    // MARKET_SNAPSHOT job that genuinely has no snapshot yet, and hide the
    // counts/실행 옵션 rows instead of rendering the fallback as if it were
    // real data (see `batch-detail-panel.tsx`'s `hasSnapshot`).
    expect(detail.jobType).toBe('NEWS_COLLECTION');
    expect(detail.counts).toBe('0 / 0 / 0');
    expect(detail.pageVersion).toBe('-');
    expect(detail.pageId).toBeNull();
    expect(detail.forceRun).toBeNull();
    expect(detail.rebuildPageOnly).toBeNull();
  });
});

describe('mapBatchListItemToRun — jobType/currentStep (docs/api_spec.json)', () => {
  it('carries jobType through verbatim, including an unrecognized value', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobType: 'SOME_FUTURE_TYPE',
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: 'RUNNING',
          currentStep: '뉴스 수집',
          startedAt: '2026-03-31T06:12:00Z',
          endedAt: null,
          durationSeconds: null,
          marketScope: 'GLOBAL',
          rawNewsCount: 10,
          processedNewsCount: 5,
          clusterCount: 0,
          pageId: null,
          pageVersionNo: null,
          partialMessage: null,
        },
      ],
      pagination: { page: 1, size: 20, totalCount: 1 },
      summary: {
        successCount: 0,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 0,
      },
    });

    expect(jobsView.rows[0].jobType).toBe('SOME_FUTURE_TYPE');
    expect(jobsView.rows[0].currentStep).toBe('뉴스 수집');
  });

  it('maps a null currentStep to null (not "null" or undefined)', () => {
    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobType: 'NEWS_COLLECTION',
          jobName: 'daily',
          businessDate: '2026-03-31',
          status: 'FAILED',
          currentStep: null,
          startedAt: '2026-03-31T06:12:00Z',
          endedAt: '2026-03-31T06:13:09Z',
          durationSeconds: 69,
          marketScope: 'GLOBAL',
          rawNewsCount: 21,
          processedNewsCount: 0,
          clusterCount: 0,
          pageId: null,
          pageVersionNo: null,
          partialMessage: null,
        },
      ],
      pagination: { page: 1, size: 20, totalCount: 1 },
      summary: {
        successCount: 0,
        partialCount: 0,
        failedCount: 1,
        avgDurationSeconds: 69,
      },
    });

    expect(jobsView.rows[0].currentStep).toBeNull();
  });
});

describe('batch step execution history', () => {
  const detailWithSteps = (
    steps: Parameters<typeof mapBatchDetailToRun>[0]['steps']
  ) =>
    mapBatchDetailToRun({
      jobId: 4242,
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'ai_retry_batch',
      businessDate: '2026-08-10',
      status: 'SUCCESS',
      currentStep: null,
      startedAt: '2026-08-10T06:10:00',
      endedAt: '2026-08-10T06:10:05',
      durationSeconds: 5,
      partialMessage: null,
      errorCode: null,
      errorMessage: null,
      logSummary: null,
      snapshot: null,
      newsCollection: null,
      steps,
    });

  it('preserves API order and keeps a retried stepCode as two separate rows', () => {
    const detail = detailWithSteps([
      {
        stepCode: 'CREATE_JOB',
        status: 'SUCCEEDED',
        startedAt: '2026-08-10T06:10:00',
        endedAt: '2026-08-10T06:10:00',
        durationMs: 12,
        errorMessage: null,
        errorLog: null,
      },
      {
        stepCode: 'AI_RETRY_GENERATE',
        status: 'FAILED',
        startedAt: '2026-08-10T06:10:00',
        endedAt: '2026-08-10T06:10:01',
        durationMs: 1100,
        errorMessage: 'LLM timeout',
        errorLog: 'stack',
      },
      {
        stepCode: 'AI_RETRY_GENERATE',
        status: 'SUCCEEDED',
        startedAt: '2026-08-10T06:10:01',
        endedAt: '2026-08-10T06:10:05',
        durationMs: 4210,
        errorMessage: null,
        errorLog: null,
      },
    ]);

    expect(detail.steps).toEqual([
      {
        stepCode: 'CREATE_JOB',
        label: '작업 생성',
        status: 'SUCCEEDED',
        duration: '12ms',
      },
      {
        stepCode: 'AI_RETRY_GENERATE',
        label: 'AI 요약 재처리',
        status: 'FAILED',
        duration: '-',
      },
      {
        stepCode: 'AI_RETRY_GENERATE',
        label: 'AI 요약 재처리',
        status: 'SUCCEEDED',
        duration: '4.21초',
      },
    ]);
  });

  it('keeps unknown step codes and statuses visible instead of dropping them', () => {
    const detail = detailWithSteps([
      {
        stepCode: 'SOME_FUTURE_STEP',
        status: 'skipped',
        startedAt: '2026-08-10T06:10:00',
        endedAt: null,
        durationMs: null,
        errorMessage: null,
        errorLog: null,
      },
    ]);

    expect(detail.steps).toEqual([
      {
        stepCode: 'SOME_FUTURE_STEP',
        label: 'SOME_FUTURE_STEP',
        status: 'SKIPPED',
        duration: '-',
      },
    ]);
  });

  it('falls back to "-" when a succeeded step reports a malformed duration', () => {
    const detail = detailWithSteps([
      {
        stepCode: 'FINALIZE_JOB',
        status: 'SUCCEEDED',
        startedAt: '2026-08-10T06:10:00',
        endedAt: '2026-08-10T06:10:05',
        durationMs: 'nope' as unknown as number,
        errorMessage: null,
        errorLog: null,
      },
    ]);

    expect(detail.steps[0].duration).toBe('-');
  });

  it('returns an empty history for old jobs and for list-derived rows', () => {
    expect(detailWithSteps([]).steps).toEqual([]);

    const jobsView = mapBatchJobsToView({
      items: [
        {
          jobId: 1,
          jobType: 'NEWS_COLLECTION',
          jobName: 'daily',
          businessDate: '2026-08-10',
          status: 'SUCCESS',
          currentStep: null,
          startedAt: '2026-08-10T06:12:00Z',
          endedAt: '2026-08-10T06:13:09Z',
          durationSeconds: 69,
          marketScope: 'GLOBAL',
          rawNewsCount: 21,
          processedNewsCount: 0,
          clusterCount: 0,
          pageId: null,
          pageVersionNo: null,
          partialMessage: null,
        },
      ],
      pagination: { page: 1, size: 20, totalCount: 1 },
      summary: {
        successCount: 1,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 69,
      },
    });

    expect(jobsView.rows[0].steps).toEqual([]);
  });
});
