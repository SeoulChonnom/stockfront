import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { KeyPoint } from '@/lib/view-models';

import { KeyPointsBlock } from './key-points-block';

const KEY_POINTS: KeyPoint[] = [
  {
    kind: 'direction',
    label: '시장 방향',
    text: '미국 증시는 상승했지만 한국 증시는 하락해 시장별 흐름이 엇갈렸습니다.',
    direction: 'MIXED',
  },
  {
    kind: 'driver',
    label: '주요 원인',
    text: '금리 인하 기대와 국내 반도체주 약세가 주요 변동 요인이었습니다.',
  },
  {
    kind: 'watch',
    label: '관전 포인트',
    text: '미국 물가 지표와 외국인의 반도체주 수급을 확인할 필요가 있습니다.',
  },
];

describe('KeyPointsBlock', () => {
  it('renders the section heading and all 3 items with server-fixed labels and full sentences', () => {
    render(<KeyPointsBlock keyPoints={KEY_POINTS} />);

    const heading = screen.getByRole('heading', {
      level: 2,
      name: '오늘의 핵심',
    });
    // The heading and content share one labelled section — not a bare
    // heading floating outside its landmark.
    const section = heading.closest('section');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);

    expect(screen.getByText('시장 방향')).toBeInTheDocument();
    expect(screen.getByText('주요 원인')).toBeInTheDocument();
    expect(screen.getByText('관전 포인트')).toBeInTheDocument();

    for (const point of KEY_POINTS) {
      expect(screen.getByText(point.text)).toBeInTheDocument();
    }
  });

  it('renders null (no section, no heading) when keyPoints is empty — no empty landmark', () => {
    const { container } = render(<KeyPointsBlock keyPoints={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByRole('heading', { name: '오늘의 핵심' })
    ).not.toBeInTheDocument();
  });

  it.each([
    ['UP', '상승'],
    ['DOWN', '하락'],
    ['MIXED', '혼조'],
    ['FLAT', '보합'],
  ] as const)(
    'shows direction %s as a visible word (%s), not only a color or glyph',
    (direction, word) => {
      const points: KeyPoint[] = [
        {
          kind: 'direction',
          label: KEY_POINTS[0].label,
          text: KEY_POINTS[0].text,
          direction,
        },
        KEY_POINTS[1],
        KEY_POINTS[2],
      ];

      render(<KeyPointsBlock keyPoints={points} />);

      const wordNode = screen.getByText(word);
      expect(wordNode).toBeInTheDocument();
      // The word itself is visible text, not screen-reader-only — direction
      // must be legible without relying on color perception.
      expect(wordNode).not.toHaveClass('sr-only');
    }
  );

  it('does not render a direction tag for driver/watch items', () => {
    render(<KeyPointsBlock keyPoints={KEY_POINTS} />);

    // Only the direction item's word ("혼조") should appear; driver/watch
    // items carry no `direction` field and must not fabricate one.
    expect(screen.queryByText('상승')).not.toBeInTheDocument();
    expect(screen.queryByText('하락')).not.toBeInTheDocument();
    expect(screen.queryByText('보합')).not.toBeInTheDocument();
  });
});
