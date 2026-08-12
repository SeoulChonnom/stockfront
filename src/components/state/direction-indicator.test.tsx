import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DirectionIndicator } from './direction-indicator';
import { directionTextClass } from './direction-text-class';

describe('DirectionIndicator', () => {
  it('states 상승 in words next to the up glyph', () => {
    render(<DirectionIndicator direction='up' />);

    expect(screen.getByText('상승')).toBeInTheDocument();
    expect(screen.getByText('상승')).toHaveClass('sr-only');
    expect(screen.getByText('상승')).not.toHaveAttribute('aria-hidden');
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
    expect(directionTextClass('none')).toContain('faint');
  });

  it('renders nothing for a neutral direction — no glyph, no 상승/하락 claim', () => {
    const { container } = render(<DirectionIndicator direction='none' />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('상승')).not.toBeInTheDocument();
    expect(screen.queryByText('하락')).not.toBeInTheDocument();
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
    expect(screen.queryByText('▼')).not.toBeInTheDocument();
  });
});
