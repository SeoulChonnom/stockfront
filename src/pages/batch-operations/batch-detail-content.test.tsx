import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AiRetryRunResponse } from '@/lib/api/types';
import type { BatchRunRow } from '@/lib/query-hooks';

import {
  BatchDetailContent,
  type BatchDetailContentProps,
} from './batch-detail-content';

function createRun(overrides: Partial<BatchRunRow> = {}): BatchRunRow {
  return {
    id: 101,
    jobName: 'market_daily_batch',
    jobType: 'MARKET_SNAPSHOT',
    currentStep: '페이지 스냅샷',
    market: 'N/A',
    businessDate: '2026-07-26',
    status: 'PARTIAL',
    rawStatus: 'PARTIAL',
    startedAt: '06:10:00',
    finishedAt: '06:12:15',
    duration: '2m 15s',
    counts: '174 / 114 / 21',
    detail: 'market_daily_batch 배치가 PARTIAL 상태로 기록되었습니다.',
    pageVersion: 'v3',
    pageId: 501,
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: false,
    rebuildPageOnly: false,
    steps: [],
    ...overrides,
  };
}

function createProps(
  overrides: Partial<BatchDetailContentProps> = {}
): BatchDetailContentProps {
  return {
    canRetryAi: true,
    detailHeadingRef: createRef<HTMLHeadingElement>(),
    isCurrentRetryJob: () => true,
    onAnnounce: vi.fn(),
    onReRun: vi.fn(),
    retryAiMutation: {
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      variables: undefined,
      mutate: vi.fn(),
    },
    run: createRun(),
    ...overrides,
  };
}

describe('BatchDetailContent', () => {
  it('renders detail fields, status, snapshot navigation, and same-date rerun action', async () => {
    const user = userEvent.setup();
    const onReRun = vi.fn();

    render(<BatchDetailContent {...createProps({ onReRun })} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'job 101' })
    ).toBeInTheDocument();
    expect(screen.getByText('부분 생성')).toBeInTheDocument();
    expect(screen.getByText('174 / 114 / 21')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '2026-07-26 스냅샷 열기' })
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/market/archive/2026-07-26')
    );

    await user.click(
      screen.getByRole('button', { name: '같은 기준일 재실행' })
    );
    expect(onReRun).toHaveBeenCalledWith('2026-07-26');
  });

  it('keeps PARTIAL AI retry action disabled while pending without a second request', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    const onAnnounce = vi.fn();

    render(
      <BatchDetailContent
        {...createProps({
          onAnnounce,
          retryAiMutation: {
            ...createProps().retryAiMutation,
            isPending: true,
            variables: { jobId: 101 },
            mutate,
          },
        })}
      />
    );

    const retryButton = screen.getByRole('button', {
      name: 'AI 요약만 재시도',
    });
    expect(retryButton).toBeDisabled();
    await user.click(retryButton);
    expect(mutate).not.toHaveBeenCalled();
    expect(onAnnounce).not.toHaveBeenCalled();
  });

  it('announces accepted AI retry only for the still-selected job', async () => {
    const user = userEvent.setup();
    const onAnnounce = vi.fn();
    const response: AiRetryRunResponse = {
      jobId: 1043,
      jobName: 'market_snapshot_ai_retry',
      businessDate: '2026-07-26',
      status: 'RUNNING',
      runMode: 'AI_SUMMARY_RETRY',
      sourceJobId: 101,
      sourcePageId: 501,
      idempotencyKey: 'retry-key-1',
      startedAt: '2026-08-07T08:24:31Z',
    };
    let onSuccess: ((data: AiRetryRunResponse) => void) | undefined;
    const mutate = vi.fn(
      (
        _variables: { jobId: number },
        options?: { onSuccess?: (data: AiRetryRunResponse) => void }
      ) => {
        onSuccess = options?.onSuccess;
      }
    );

    render(
      <BatchDetailContent
        {...createProps({
          onAnnounce,
          retryAiMutation: { ...createProps().retryAiMutation, mutate },
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'AI 요약만 재시도' }));
    expect(onAnnounce).toHaveBeenCalledWith(
      'AI 요약 재시도를 요청하고 있습니다.'
    );
    expect(mutate).toHaveBeenCalledWith({ jobId: 101 }, expect.anything());

    act(() => {
      onSuccess?.(response);
    });
    expect(onAnnounce).toHaveBeenCalledWith('AI 요약 재시도가 접수되었습니다.');
  });

  it('renders a succeeded step run with its label and formatted duration', () => {
    render(
      <BatchDetailContent
        {...createProps({
          run: createRun({
            steps: [
              {
                stepCode: 'CREATE_JOB',
                label: '작업 생성',
                status: 'SUCCEEDED',
                duration: '12ms',
              },
            ],
          }),
        })}
      />
    );

    expect(screen.getByText('작업 생성')).toBeInTheDocument();
    expect(screen.getByText('성공')).toBeInTheDocument();
    expect(screen.getByText('12ms')).toBeInTheDocument();
  });
});
