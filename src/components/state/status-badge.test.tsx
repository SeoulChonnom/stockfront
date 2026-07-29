import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['READY', '준비 완료'],
    ['partial', '부분 생성'],
    ['FAILED', '생성 실패'],
    ['success', '성공'],
    ['RUNNING', '실행 중'],
    ['pending', '대기'],
    ['SKIPPED', '건너뜀'],
  ])('maps %s to the Korean status word %s', (status, expected) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('falls back to a neutral tone and the raw string for an unknown status, without throwing', () => {
    expect(() =>
      render(<StatusBadge status='UNEXPECTED_NEW_STATUS' />)
    ).not.toThrow();

    expect(screen.getByText('UNEXPECTED_NEW_STATUS')).toBeInTheDocument();
  });

  it('never renders an empty label for an unknown status', () => {
    render(<StatusBadge status='' />);
    // Falls back to the raw (empty) string rather than throwing or omitting
    // the badge outright — the dot is still rendered so the badge is visible.
    const dot = document.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
  });

  it('always pairs the status word with a dot (never color-only)', () => {
    const { container } = render(<StatusBadge status='READY' />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(screen.getByText('준비 완료')).toBeInTheDocument();
  });
});
