import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { ApiError } from '@/lib/api/client';
import type { BatchRunResponse } from '@/lib/api/types';
import { useStartBatchRunMutation } from '@/lib/query-hooks';

import { TriggerDialog } from './trigger-dialog';

/**
 * README §7-7 lifecycle: idle → pending → success/409/403/422/429/5xx/
 * network, duplicate submit structurally impossible during pending, input
 * preserved after a failure. Exercises the REAL `useStartBatchRunMutation`
 * (not a hand-rolled fake mutation object) against a mocked `startBatchRun`
 * API call, so the mutation-variable plumbing this phase added
 * (`useStartBatchRunMutation` now takes a `BatchRunRequest` instead of
 * hardcoding `startBatchRun({})`) is verified end to end.
 */

const { mockStartBatchRun } = vi.hoisted(() => ({
  mockStartBatchRun: vi.fn(),
}));

vi.mock('@/lib/api/batch', () => ({
  startBatchRun: mockStartBatchRun,
}));

function Harness({
  onOpenJobDetail = vi.fn(),
  onTriggered = vi.fn(),
  canUseAdvancedOptions = true,
}: {
  onOpenJobDetail?: (jobId: number) => void;
  onTriggered?: (result: BatchRunResponse) => void;
  canUseAdvancedOptions?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const mutation = useStartBatchRunMutation();

  return (
    <>
      <button id='trigger-btn' onClick={() => setIsOpen(true)} type='button'>
        수동 실행
      </button>
      <TriggerDialog
        canUseAdvancedOptions={canUseAdvancedOptions}
        isOpen={isOpen}
        mutation={mutation}
        onClose={() => setIsOpen(false)}
        onOpenJobDetail={onOpenJobDetail}
        onTriggered={onTriggered}
      />
    </>
  );
}

function renderDialog(props: Parameters<typeof Harness>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AnnounceProvider pathname='/test'>
        <Harness {...props} />
      </AnnounceProvider>
    </QueryClientProvider>
  );
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '실행' }));
}

beforeEach(() => {
  mockStartBatchRun.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TriggerDialog', () => {
  it('idle → pending → success, replacing the form so duplicate submit is structurally impossible', async () => {
    const user = userEvent.setup();
    const onTriggered = vi.fn();
    let resolveRequest: (value: BatchRunResponse) => void = () => {};
    mockStartBatchRun.mockReturnValue(
      new Promise<BatchRunResponse>((resolve) => {
        resolveRequest = resolve;
      })
    );

    renderDialog({ onTriggered });

    expect(
      screen.getByRole('dialog', { name: '배치 수동 실행' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기준일 (KST)')).toBeInTheDocument();
    await submit(user);

    expect(screen.getByText('실행 요청을 보내고 있습니다')).toBeInTheDocument();
    // The form (and its 실행 button) is gone, not merely disabled.
    expect(
      screen.queryByRole('button', { name: '실행' })
    ).not.toBeInTheDocument();
    expect(mockStartBatchRun).toHaveBeenCalledTimes(1);

    resolveRequest({
      jobId: 1043,
      jobName: 'market_daily_batch',
      businessDate: '2026-07-27',
      status: 'RUNNING',
      startedAt: '2026-07-27T08:24:31',
    });

    await waitFor(() => {
      expect(screen.getByText('job 1043')).toBeInTheDocument();
    });
    expect(onTriggered).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 1043 })
    );
    expect(
      screen.getByRole('button', { name: '작업 상세 보기' })
    ).toBeInTheDocument();
  });

  it('closes while pending without resetting the request, then reopens as pending', async () => {
    const user = userEvent.setup();
    let resolveRequest: (value: BatchRunResponse) => void = () => {};
    mockStartBatchRun.mockReturnValue(
      new Promise<BatchRunResponse>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const view = renderDialog();
    await submit(user);

    const closeButton = screen.getByRole('button', { name: '닫기' });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveFocus();
    });

    await user.click(closeButton);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockStartBatchRun).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '수동 실행' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveFocus();
    });
    expect(
      screen.queryByRole('button', { name: '실행' })
    ).not.toBeInTheDocument();
    expect(mockStartBatchRun).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '수동 실행' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveFocus();
    });

    const overlay = view.container.querySelector('[data-dismiss-overlay]');
    expect(overlay).toBeTruthy();
    if (overlay) {
      await user.click(overlay);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockStartBatchRun).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '수동 실행' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveFocus();
    });

    resolveRequest({
      jobId: 1043,
      jobName: 'market_daily_batch',
      businessDate: '2026-07-27',
      status: 'RUNNING',
      startedAt: '2026-07-27T08:24:31',
    });

    expect(await screen.findByText('job 1043')).toBeInTheDocument();
  });

  it('preserves the submitted date when reopened while pending and then failing', async () => {
    const user = userEvent.setup();
    let rejectRequest: (reason: unknown) => void = () => {};
    mockStartBatchRun.mockReturnValue(
      new Promise<BatchRunResponse>((_resolve, reject) => {
        rejectRequest = reject;
      })
    );

    renderDialog();
    const dateInput = screen.getByLabelText<HTMLInputElement>('기준일 (KST)');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-07-20');
    await submit(user);

    expect(mockStartBatchRun).toHaveBeenCalledWith(
      expect.objectContaining({ businessDate: '2026-07-20' })
    );
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: '닫기' }));
    await user.click(screen.getByRole('button', { name: '수동 실행' }));
    await screen.findByRole('status');

    rejectRequest(
      new ApiError('failed', 500, { code: 'INTERNAL_BATCH_ERROR' })
    );
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: '입력으로 돌아가기' }));

    expect(screen.getByLabelText<HTMLInputElement>('기준일 (KST)').value).toBe(
      '2026-07-20'
    );
  });

  it('restores focus to the date field when returning from an error to input', async () => {
    const user = userEvent.setup();
    mockStartBatchRun.mockRejectedValue(
      new ApiError('failed', 422, { code: 'INVALID_BUSINESS_DATE' })
    );

    renderDialog();
    await submit(user);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: '입력으로 돌아가기' }));

    await waitFor(() => {
      expect(screen.getByLabelText('기준일 (KST)')).toHaveFocus();
    });
  });

  it('opening 작업 상세 보기 from success closes the dialog and navigates to the job', async () => {
    const user = userEvent.setup();
    const onOpenJobDetail = vi.fn();
    mockStartBatchRun.mockResolvedValue({
      jobId: 1043,
      jobName: 'market_daily_batch',
      businessDate: '2026-07-27',
      status: 'RUNNING',
      startedAt: '2026-07-27T08:24:31',
    });

    renderDialog({ onOpenJobDetail });
    await submit(user);

    await screen.findByRole('button', { name: '작업 상세 보기' });
    await user.click(screen.getByRole('button', { name: '작업 상세 보기' }));

    expect(onOpenJobDetail).toHaveBeenCalledWith(1043);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    {
      status: 409,
      body: { code: 'BATCH_ALREADY_RUNNING', existingJobId: 1042 },
      expectCode: 'BATCH_ALREADY_RUNNING',
      expectExisting: true,
    },
    {
      status: 403,
      body: { code: 'FORBIDDEN' },
      expectMessage:
        '수동 실행 권한이 없습니다. 관리자(ADMIN) 권한이 필요합니다.',
    },
    {
      status: 422,
      body: { code: 'INVALID_BUSINESS_DATE', field: 'businessDate' },
      expectMessage: '미래 날짜는 실행할 수 없습니다.',
    },
    {
      status: 429,
      body: { code: 'RATE_LIMITED' },
      expectMessage: '요청이 너무 많습니다. 60초 후 다시 시도해 주세요.',
    },
    {
      status: 500,
      body: { code: 'INTERNAL_BATCH_ERROR' },
      expectMessage: '배치 실행 요청을 처리하지 못했습니다.',
    },
  ])(
    'maps a $status response to its exact §7-7 error copy',
    async ({ status, body, expectMessage, expectCode, expectExisting }) => {
      const user = userEvent.setup();
      mockStartBatchRun.mockRejectedValue(new ApiError('failed', status, body));

      renderDialog();
      await submit(user);

      await screen.findByRole('alert');
      expect(screen.getByRole('alert')).toHaveTextContent(String(status));
      if (expectMessage) {
        expect(screen.getByRole('alert')).toHaveTextContent(expectMessage);
      }
      if (expectCode) {
        expect(screen.getByRole('alert')).toHaveTextContent(expectCode);
      }
      if (expectExisting) {
        expect(
          screen.getByRole('button', { name: 'job 1042 열기' })
        ).toBeInTheDocument();
      }
      expect(
        screen.getByText(
          '입력값은 그대로 유지됩니다. 원인을 확인한 뒤 다시 시도할 수 있습니다.'
        )
      ).toBeInTheDocument();
    }
  );

  it('maps a network failure (ApiError status 0) to the offline copy', async () => {
    const user = userEvent.setup();
    mockStartBatchRun.mockRejectedValue(
      new ApiError('네트워크에 연결할 수 없습니다.', 0, null)
    );

    renderDialog();
    await submit(user);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(
      '네트워크에 연결할 수 없습니다.'
    );
  });

  it('409 without an existingJobId in the body omits the "job N 열기" button', async () => {
    const user = userEvent.setup();
    mockStartBatchRun.mockRejectedValue(
      new ApiError('failed', 409, { code: 'BATCH_ALREADY_RUNNING' })
    );

    renderDialog();
    await submit(user);

    await screen.findByRole('alert');
    expect(
      screen.queryByRole('button', { name: /열기$/ })
    ).not.toBeInTheDocument();
  });

  it('preserves the submitted businessDate after a failure and returning to input', async () => {
    const user = userEvent.setup();
    mockStartBatchRun.mockRejectedValue(
      new ApiError('failed', 500, { code: 'INTERNAL_BATCH_ERROR' })
    );

    renderDialog();
    const dateInput = screen.getByLabelText<HTMLInputElement>('기준일 (KST)');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-07-20');

    await submit(user);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: '입력으로 돌아가기' }));

    expect(screen.getByLabelText<HTMLInputElement>('기준일 (KST)').value).toBe(
      '2026-07-20'
    );
  });

  it('flags the date field invalid after a 422 and returning to input', async () => {
    const user = userEvent.setup();
    mockStartBatchRun.mockRejectedValue(
      new ApiError('failed', 422, { code: 'INVALID_BUSINESS_DATE' })
    );

    renderDialog();
    await submit(user);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: '입력으로 돌아가기' }));

    expect(screen.getByLabelText('기준일 (KST)')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('omits the 고급 옵션 toggle when canUseAdvancedOptions is false (D-11)', () => {
    renderDialog({ canUseAdvancedOptions: false });

    expect(
      screen.queryByRole('button', { name: /고급 옵션/ })
    ).not.toBeInTheDocument();
  });
});
