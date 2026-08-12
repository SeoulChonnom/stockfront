import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DirectionIndicator, directionTextClass } from './direction-indicator';

describe('DirectionIndicator', () => {
  it('states 상승 in words next to the up glyph', () => {
    render(<DirectionIndicator direction='up' />);

    expect(screen.getByText('상승')).toBeInTheDocument();
    expect(screen.getByText('상승')).toHaveClass('sr-only');
    expect(screen.getByText('▲')).toHaveAttribute('aria-hidden', 'true');
  });

  it('states 하락 in words next to the down glyph', () => {
    render(<DirectionIndicator direction='down' />);

    expect(screen.getByText('하락')).toBeInTheDocument();
    expect(screen.getByText('▼')).toHaveAttribute('aria-hidden', 'true');
  });

  it('maps each direction to its own colour token class', () => {
    expect(directionTextClass('up')).toContain('--up');
    expect(directionTextClass('down')).toContain('--down');
  });
});
