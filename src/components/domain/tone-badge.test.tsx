import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ToneBadge } from '@/components/domain/tone-badge';

describe('ToneBadge', () => {
  it.each([
    ['success', 'text-success', 'bg-success-soft', 'border-success-line'],
    ['warning', 'text-warning', 'bg-warning-soft', 'border-warning-line'],
    ['danger', 'text-danger', 'bg-danger-soft', 'border-danger-line'],
    ['info', 'text-info', 'bg-info-soft', 'border-info-line'],
    ['neutral', 'text-neutral', 'bg-neutral-soft', 'border-neutral-line'],
  ] as const)('applies the %s tone classes', (tone, text, bg, border) => {
    render(<ToneBadge tone={tone}>label</ToneBadge>);
    const badge = screen.getByText('label');
    expect(badge).toHaveClass(text, bg, border);
  });

  it('is square (rounded-sm), never the registry pill shape', () => {
    render(<ToneBadge tone='info'>label</ToneBadge>);
    const badge = screen.getByText('label');
    expect(badge).toHaveClass('rounded-sm');
    expect(badge.className).not.toMatch(/\brounded-full\b/);
  });

  it('never mixes in the outline registry defaults it overrides', () => {
    render(<ToneBadge tone='info'>label</ToneBadge>);
    const badge = screen.getByText('label');
    expect(badge.className).not.toMatch(/\bborder-border\b/);
    expect(badge.className).not.toMatch(/\btext-foreground\b/);
  });

  it('defaults to the label-size geometry', () => {
    render(<ToneBadge tone='info'>label</ToneBadge>);
    const badge = screen.getByText('label');
    expect(badge).toHaveClass('px-[9px]', 'py-1', 'text-label', 'gap-1.5');
  });

  it('applies the sm geometry', () => {
    render(
      <ToneBadge size='sm' tone='info'>
        label
      </ToneBadge>
    );
    const badge = screen.getByText('label');
    expect(badge).toHaveClass('px-2', 'py-[3px]', 'text-body-sm', 'gap-[5px]');
  });

  it('applies the compact geometry', () => {
    render(
      <ToneBadge size='compact' tone='info'>
        label
      </ToneBadge>
    );
    const badge = screen.getByText('label');
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-body-sm', 'gap-1.5');
  });

  it('merges a caller className without dropping the tone', () => {
    render(
      <ToneBadge className='tnum' tone='danger'>
        label
      </ToneBadge>
    );
    const badge = screen.getByText('label');
    expect(badge).toHaveClass('tnum', 'text-danger');
  });
});
