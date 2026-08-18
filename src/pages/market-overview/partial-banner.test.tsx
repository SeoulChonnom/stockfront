import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MarketSnapshot } from '@/lib/view-models';

import { PartialBanner } from './partial-banner';

function buildSnapshot(
  overrides: Partial<MarketSnapshot> = {}
): MarketSnapshot {
  return {
    pageId: 1,
    businessDate: '2026-08-13',
    versionNo: 1,
    generatedAt: '2026-08-13 06:12 KST',
    status: 'partial',
    globalHeadline: 'headline',
    partialMessage: null,
    keyPoints: [],
    issues: [],
    navigation: { previousBusinessDate: null, nextBusinessDate: null },
    // "일부 누락"은 일부가 있을 때만 참이므로 배너는 시장 섹션이 하나라도
    // 있을 때만 뜬다. 기본 픽스처가 `markets: []`이면 실제로는 올 수 없는
    // 조합(부분 생성인데 시장이 통째로 없음)을 검증하게 된다.
    markets: [
      {
        label: '미국 증시',
        marketType: 'US',
        summaryTitle: null,
        summaryBody: null,
        indices: [],
        clusters: [],
      },
    ],
    ...overrides,
  };
}

describe('PartialBanner', () => {
  it('stays silent when the whole page failed — "일부 누락"은 일부가 있어야 참이다', () => {
    // FAILED 스냅샷도 `partialMessage`를 채워 보낸다. 예전에는 그것만 보고
    // 배너를 띄워서, 시장 섹션이 하나도 없는 화면에 "일부 데이터가 누락되어
    // 참고용으로 제공됩니다"가 붙었다 — 남은 데이터를 찾아 내려가면 아무
    // 것도 없다. 전체 실패는 `EmptyMarketsPanel`이 설명한다.
    const { container } = render(
      <PartialBanner
        canViewOps={false}
        snapshot={buildSnapshot({
          status: 'failed',
          markets: [],
          partialMessage: '수집 단계 실패',
        })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a ready page with no partialMessage/issues', () => {
    const { container } = render(
      <PartialBanner
        canViewOps={false}
        snapshot={buildSnapshot({ status: 'ready' })}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('B-1: shows the KEY_POINTS_GENERATION_FAILED message to a non-ops user (server message is safe per A-1-4)', () => {
    render(
      <PartialBanner
        canViewOps={false}
        snapshot={buildSnapshot({
          issues: [
            {
              category: 'AI_SUMMARY',
              code: 'KEY_POINTS_GENERATION_FAILED',
              message: '오늘의 핵심 포인트를 준비하지 못했습니다.',
            },
          ],
        })}
      />
    );

    expect(
      screen.getByText('오늘의 핵심 포인트를 준비하지 못했습니다.')
    ).toBeInTheDocument();
  });

  it('B-1: a general AI_SUMMARY_FALLBACK issue renders its own distinct message, not the keyPoints-specific one', () => {
    render(
      <PartialBanner
        canViewOps={false}
        snapshot={buildSnapshot({
          issues: [
            {
              category: 'AI_SUMMARY',
              code: 'AI_SUMMARY_FALLBACK',
              message: '요약 생성이 실패해 원문 위주로 제공됩니다.',
            },
          ],
        })}
      />
    );

    expect(
      screen.getByText('요약 생성이 실패해 원문 위주로 제공됩니다.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('오늘의 핵심 포인트를 준비하지 못했습니다.')
    ).not.toBeInTheDocument();
  });

  it('renders no issues list when issues is empty (only the market-metadata "상세 정보" path may add detail)', () => {
    render(
      <PartialBanner
        canViewOps={false}
        snapshot={buildSnapshot({ partialMessage: '일부 데이터 누락' })}
      />
    );

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('keeps the ops-only raw partialMessage gated behind canViewOps, unaffected by the new issues list', () => {
    const snapshot = buildSnapshot({
      partialMessage: '내부 파이프라인 진단 메시지',
    });

    const { rerender } = render(
      <PartialBanner canViewOps={false} snapshot={snapshot} />
    );
    expect(
      screen.queryByText('내부 파이프라인 진단 메시지')
    ).not.toBeInTheDocument();

    rerender(<PartialBanner canViewOps={true} snapshot={snapshot} />);
    expect(screen.getByText('내부 파이프라인 진단 메시지')).toBeInTheDocument();
  });

  it('still lists per-market missing-data detail rows alongside a page-level issue', () => {
    render(
      <PartialBanner
        canViewOps={true}
        snapshot={buildSnapshot({
          issues: [
            {
              category: 'AI_SUMMARY',
              code: 'KEY_POINTS_GENERATION_FAILED',
              message: '오늘의 핵심 포인트를 준비하지 못했습니다.',
            },
          ],
          markets: [
            {
              label: '한국 증시',
              marketType: 'KR',
              summaryTitle: null,
              summaryBody: null,
              indices: [],
              clusters: [],
              metadata: {
                rawNewsCount: 1,
                processedNewsCount: 1,
                clusterCount: 1,
                lastUpdatedAt: '2026-08-13 06:12 KST',
                partialMessage: 'KRX 지수 수집 실패',
                sourceDate: null,
                expectedSessionDate: null,
              },
            },
          ],
        })}
      />
    );

    expect(
      screen.getByText('오늘의 핵심 포인트를 준비하지 못했습니다.')
    ).toBeInTheDocument();
    expect(screen.getByText('상세 정보')).toBeInTheDocument();
  });
});
