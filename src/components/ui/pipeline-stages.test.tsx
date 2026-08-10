import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BatchStepRunView } from '@/lib/view-models';

import { PipelineStages } from './pipeline-stages';

/**
 * `steps` (BatchJobDetailResponse.steps) replaced the old currentStep/errorCode
 * inference — see `docs/design_v2/v2-decisions.md` §10. These tests cover
 * rendering the ordered execution history as-is, including retries.
 */
describe('PipelineStages', () => {
  it('renders two AI_RETRY_GENERATE items as two rows in input order', () => {
    const steps: BatchStepRunView[] = [
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
    ];

    render(<PipelineStages steps={steps} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('실패');
    expect(items[1].textContent).toContain('성공');
  });

  it('shows 실패 and - for the failed row', () => {
    const steps: BatchStepRunView[] = [
      {
        stepCode: 'AI_RETRY_GENERATE',
        label: 'AI 요약 재처리',
        status: 'FAILED',
        duration: '-',
      },
    ];

    render(<PipelineStages steps={steps} />);

    const item = screen.getByRole('listitem');
    expect(item.textContent).toContain('실패');
    expect(item.textContent).toContain('-');
  });

  it('shows 성공 and 4.21초 for the successful retry', () => {
    const steps: BatchStepRunView[] = [
      {
        stepCode: 'AI_RETRY_GENERATE',
        label: 'AI 요약 재처리',
        status: 'SUCCEEDED',
        duration: '4.21초',
      },
    ];

    render(<PipelineStages steps={steps} />);

    const item = screen.getByRole('listitem');
    expect(item.textContent).toContain('성공');
    expect(item.textContent).toContain('4.21초');
  });

  it('shows 실행 중 and - for RUNNING', () => {
    const steps: BatchStepRunView[] = [
      {
        stepCode: 'GENERATE_AI_SUMMARIES',
        label: 'AI 요약 생성',
        status: 'RUNNING',
        duration: '-',
      },
    ];

    render(<PipelineStages steps={steps} />);

    const item = screen.getByRole('listitem');
    expect(item.textContent).toContain('실행 중');
    expect(item.textContent).toContain('-');
  });

  it('keeps unknown step code and status text visible', () => {
    const steps: BatchStepRunView[] = [
      {
        stepCode: 'SOME_FUTURE_STEP',
        label: 'SOME_FUTURE_STEP',
        status: 'DEFERRED',
        duration: '-',
      },
    ];

    render(<PipelineStages steps={steps} />);

    expect(screen.getByText('SOME_FUTURE_STEP')).toBeInTheDocument();
    expect(screen.getByText('DEFERRED')).toBeInTheDocument();
  });

  it('shows the empty state when there are no steps', () => {
    render(<PipelineStages steps={[]} />);

    expect(screen.getByText('스텝 실행 이력이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('never renders the PROPOSED · BACKEND badge', () => {
    const steps: BatchStepRunView[] = [
      {
        stepCode: 'CREATE_JOB',
        label: '작업 생성',
        status: 'SUCCEEDED',
        duration: '12ms',
      },
    ];

    render(<PipelineStages steps={steps} />);

    expect(screen.queryByText('PROPOSED · BACKEND')).not.toBeInTheDocument();
  });
});
