import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type {
  AnalysisIssue,
  ClusterArticle,
  ClusterSection,
} from '@/lib/view-models';

import { ClusterAnalysis } from './cluster-analysis';

const ARTICLES: ClusterArticle[] = [
  {
    id: '1024',
    source: '연합뉴스',
    publishedAt: '2026-08-12 21:10',
    title: '반도체주 약세 관련 기사',
    originalUrl: 'https://example.com/1024',
    mirrorUrl: null,
    similarGroupId: 'sim-1024',
    isSimilarGroupRepresentative: true,
    exactDuplicateCount: 0,
  },
  {
    id: '2048',
    source: '한국경제',
    publishedAt: '2026-08-12 21:30',
    title: '외국인 수급 관련 기사',
    originalUrl: 'https://example.com/2048',
    mirrorUrl: null,
    similarGroupId: 'sim-2048',
    isSimilarGroupRepresentative: true,
    exactDuplicateCount: 0,
  },
];

function oneSentenceSection(
  overrides: Partial<ClusterSection> = {}
): ClusterSection[] {
  return [
    {
      kind: 'background',
      title: '발생 배경',
      paragraphs: [
        {
          sentences: [
            {
              text: '미국 반도체주 약세가 국내 시장으로 이어졌습니다.',
              sourceArticleIds: [1024],
              conflictStatus: 'NONE',
              conflictingSourceArticleIds: [],
              conflictNote: null,
            },
          ],
        },
      ],
      ...overrides,
    },
  ];
}

function renderRowFor(articleId: string) {
  const row = document.createElement('li');
  row.id = `cluster-article-${articleId}`;
  row.tabIndex = -1;
  document.body.appendChild(row);
  return row;
}

describe('ClusterAnalysis', () => {
  it('shows the analysis-generated timestamp, not any cluster last-updated time', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt='2026-08-12 07:20 KST'
        analysisIssues={[]}
        analysisLead='도입'
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={oneSentenceSection()}
      />
    );

    expect(screen.getByText(/2026-08-12 07:20 KST/)).toBeInTheDocument();
  });

  it('renders only the sections that arrived, in arrival order, with the server title', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={[
          {
            kind: 'background',
            title: '발생 배경',
            paragraphs: [
              {
                sentences: [
                  {
                    text: '배경 문장',
                    sourceArticleIds: [1024],
                    conflictStatus: 'NONE',
                    conflictingSourceArticleIds: [],
                    conflictNote: null,
                  },
                ],
              },
            ],
          },
          {
            kind: 'outlook',
            title: '향후 관전 포인트',
            paragraphs: [
              {
                sentences: [
                  {
                    text: '전망 문장',
                    sourceArticleIds: [1024],
                    conflictStatus: 'NONE',
                    conflictingSourceArticleIds: [],
                    conflictNote: null,
                  },
                ],
              },
            ],
          },
        ]}
      />
    );

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      '발생 배경',
      '향후 관전 포인트',
    ]);
    // "관련 업종·종목"/"시장 영향" were never sent — no empty heading for them.
    expect(
      screen.queryByRole('heading', { name: '시장 영향' })
    ).not.toBeInTheDocument();
  });

  it('links to the source articles section', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='UNAVAILABLE'
        articles={[]}
        conflictStatus='NOT_CHECKED'
        sections={[]}
      />
    );

    expect(screen.getByRole('link', { name: /근거 기사/ })).toHaveAttribute(
      'href',
      '#cluster-articles-heading'
    );
  });

  it('UNAVAILABLE replaces the section area with one guidance state but keeps the lead paragraph', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[
          {
            code: 'NO_GROUNDED_SENTENCES',
            message: '근거를 확인할 수 있는 분석 문장이 없습니다.',
          },
        ]}
        analysisLead='요약 리드는 분석 실패와 무관하게 유지됩니다.'
        analysisStatus='UNAVAILABLE'
        articles={[]}
        conflictStatus='NOT_CHECKED'
        sections={[]}
      />
    );

    expect(
      screen.getByText('요약 리드는 분석 실패와 무관하게 유지됩니다.')
    ).toBeInTheDocument();
    // Exactly ONE guidance heading replaces the whole section area — not
    // four empty per-kind subheadings (A-3 "UNAVAILABLE 렌더 주의").
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('심층 분석을 표시할 수 없습니다');
    // No "AI가 분석 중입니다" copy, no retry affordance implying regeneration (A-1-8).
    expect(screen.queryByText(/분석 중/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /다시 시도|재시도|retry/i })
    ).not.toBeInTheDocument();
  });

  it('shows the server issue inside the single UNAVAILABLE state', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[
          {
            code: 'ANALYSIS_GENERATION_FAILED',
            message: '분석을 생성하지 못했습니다.',
          },
        ]}
        analysisLead={null}
        analysisStatus='UNAVAILABLE'
        articles={[]}
        conflictStatus='NOT_CHECKED'
        sections={[]}
      />
    );

    expect(screen.getByText('분석을 생성하지 못했습니다.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('PARTIAL renders sections plus a non-blocking notice built from analysisIssues', () => {
    const issues: AnalysisIssue[] = [
      {
        code: 'INVALID_SOURCE_REFERENCE',
        message: '일부 분석 문장의 근거 기사를 확인하지 못했습니다.',
      },
    ];

    render(
      <ClusterAnalysis
        analysisGeneratedAt='2026-08-12 07:20 KST'
        analysisIssues={issues}
        analysisLead={null}
        analysisStatus='PARTIAL'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={oneSentenceSection()}
      />
    );

    expect(
      screen.getByText('일부 분석 문장의 근거 기사를 확인하지 못했습니다.')
    ).toBeInTheDocument();
    expect(screen.getByText('발생 배경')).toBeInTheDocument();
  });

  it('presents FOUND as information, not an error, and shows supporting vs conflicting citations distinctly', async () => {
    const user = userEvent.setup();
    const row1024 = renderRowFor('1024');
    const row2048 = renderRowFor('2048');
    const focus1024 = vi.spyOn(row1024, 'focus');

    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='FOUND'
        sections={[
          {
            kind: 'background',
            title: '발생 배경',
            paragraphs: [
              {
                sentences: [
                  {
                    text: '외국인은 반도체주를 순매도했습니다.',
                    sourceArticleIds: [1024],
                    conflictStatus: 'FOUND',
                    conflictingSourceArticleIds: [2048],
                    conflictNote:
                      '기사별 외국인 순매매 방향이 다르게 보도됐습니다.',
                  },
                ],
              },
            ],
          },
        ]}
      />
    );

    // FOUND is presented as information — the aggregate badge is visible,
    // and there is no ARIA alert/role escalation for it.
    expect(screen.getAllByText('상충하는 보도가 있음').length).toBeGreaterThan(
      0
    );
    expect(
      screen.getByText('기사별 외국인 순매매 방향이 다르게 보도됐습니다.')
    ).toBeInTheDocument();
    expect(screen.getByText('지지 기사')).toBeInTheDocument();
    expect(screen.getByText('상충 기사')).toBeInTheDocument();

    const citation = screen.getByRole('button', {
      name: /근거 기사로 이동.*반도체주 약세 관련 기사/,
    });
    await user.click(citation);

    expect(focus1024).toHaveBeenCalled();

    row1024.remove();
    row2048.remove();
  });

  it('a citation is a native <button> reachable by Tab, and activating it focuses the target row', async () => {
    const user = userEvent.setup();
    const row = renderRowFor('1024');
    const focusSpy = vi.spyOn(row, 'focus');

    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={oneSentenceSection()}
      />
    );

    const citation = screen.getByRole('button', { name: /근거 기사로 이동/ });
    // A native `<button>` needs no extra keydown handling to be
    // Enter/Space-activatable — that's the browser's default action for the
    // element type. What this component owns is: (1) the citation sits in
    // the natural tab order (no `tabIndex={-1}` opt-out), and (2)
    // activating it (jsdom doesn't simulate the native Enter-triggers-click
    // default action, so `user.click` stands in for "however it was
    // activated") calls the target-row focus behavior — covered end-to-end
    // with a real Enter key press in `e2e/cluster-analysis.spec.ts`.
    expect(citation.tagName).toBe('BUTTON');
    expect(citation).not.toHaveAttribute('tabindex', '-1');

    await user.tab(); // '근거 기사 보기' anchor, which precedes the citation in DOM order
    await user.tab();
    expect(citation).toHaveFocus();

    await user.click(citation);
    expect(focusSpy).toHaveBeenCalled();

    row.remove();
  });

  it('does not throw and no-ops when a citation target row is missing (defensive, not a user-visible error)', async () => {
    const user = userEvent.setup();
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={oneSentenceSection()}
      />
    );

    const citation = screen.getByRole('button', { name: /근거 기사로 이동/ });
    await expect(user.click(citation)).resolves.not.toThrow();
  });

  it('NOT_CHECKED uses restrained copy and never claims "충돌 없음"', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt='2026-08-12 07:20 KST'
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NOT_CHECKED'
        sections={oneSentenceSection()}
      />
    );

    const section = screen.getByRole('region', { name: 'AI 심층 분석' });
    expect(within(section).queryByText(/충돌\s*없음/)).not.toBeInTheDocument();
    expect(
      screen.getByText('이 분석은 근거 충돌 여부를 확인하지 못했습니다.')
    ).toBeInTheDocument();
  });

  it('does not expose a citation control for an unknown source row', () => {
    render(
      <ClusterAnalysis
        analysisGeneratedAt={null}
        analysisIssues={[]}
        analysisLead={null}
        analysisStatus='READY'
        articles={ARTICLES}
        conflictStatus='NONE'
        sections={[
          {
            kind: 'background',
            title: '발생 배경',
            paragraphs: [
              {
                sentences: [
                  {
                    text: '확인할 수 없는 근거를 포함한 문장입니다.',
                    sourceArticleIds: [9999],
                    conflictStatus: 'NONE',
                    conflictingSourceArticleIds: [],
                    conflictNote: null,
                  },
                ],
              },
            ],
          },
        ]}
      />
    );

    expect(
      screen.queryByRole('button', { name: /9999|기사 9999/ })
    ).not.toBeInTheDocument();
  });
});
