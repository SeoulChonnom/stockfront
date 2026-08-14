import { describe, expect, it } from 'vitest';
import type { ClusterDetailResponse } from '../api/types';
import { mapClusterDetailToView } from './cluster';

function readySummary(
  overrides: Partial<ClusterDetailResponse['summary']> = {}
): ClusterDetailResponse['summary'] {
  return {
    short: 'short summary',
    long: 'long summary',
    analysisStatus: 'READY' as const,
    analysisGeneratedAt: '2026-08-12T22:20:00Z',
    analysisIssues: [],
    conflictStatus: 'NONE' as const,
    sections: [
      {
        kind: 'background' as const,
        title: '발생 배경',
        paragraphs: [
          {
            sentences: [
              {
                text: 'sentence one',
                sourceArticleIds: [1024],
                conflictStatus: 'NONE' as const,
                conflictingSourceArticleIds: [],
                conflictNote: null,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** B-4 defaults (A-5 "현재 서버 동작"): singleton, self-representative, no exact duplicates. */
const GROUPING_DEFAULTS = {
  similarGroupId: 'sim-1024',
  isSimilarGroupRepresentative: true,
  exactDuplicateCount: 0,
} as const;

const READY_GROUPING: ClusterDetailResponse['articleGrouping'] = {
  status: 'READY',
  generatedAt: '2026-08-12T22:20:00Z',
  issue: null,
};

function baseResponse(
  overrides: Partial<ClusterDetailResponse> = {}
): ClusterDetailResponse {
  return {
    clusterId: 'cluster-1',
    businessDate: '2026-03-31',
    marketType: 'US',
    marketLabel: '미국',
    title: 'cluster title',
    tags: [],
    summary: readySummary(),
    articles: [
      {
        processedArticleId: 1024,
        publisherName: 'Source 1',
        publishedAt: '2026-03-31T06:12:00Z',
        title: 'article 1',
        originLink: 'https://example.com/1',
        naverLink: 'https://example.com/1-mirror',
        ...GROUPING_DEFAULTS,
      },
    ],
    representativeArticle: {
      processedArticleId: 1024,
      publisherName: 'Representative Source',
      publishedAt: '2026-03-31T06:14:00Z',
      title: 'representative article',
      originLink: 'https://example.com/rep',
      naverLink: 'https://example.com/rep-mirror',
      ...GROUPING_DEFAULTS,
    },
    articleGrouping: READY_GROUPING,
    articleCount: 1,
    lastUpdatedAt: '2026-03-31T06:15:00Z',
    ...overrides,
  };
}

function twoArticles(): ClusterDetailResponse['articles'] {
  return [
    {
      processedArticleId: 1,
      publisherName: 'Source 1',
      publishedAt: '2026-03-31T06:12:00Z',
      title: 'article 1',
      originLink: 'https://example.com/1',
      naverLink: 'https://example.com/1-mirror',
      similarGroupId: 'sim-1',
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: 0,
    },
    {
      processedArticleId: 2,
      publisherName: 'Source 2',
      publishedAt: '2026-03-31T06:13:00Z',
      title: 'article 2',
      originLink: 'https://example.com/2',
      naverLink: 'https://example.com/2-mirror',
      similarGroupId: 'sim-2',
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: 0,
    },
  ];
}

describe('mappers - cluster', () => {
  it('falls back to articles length when cluster articleCount is malformed', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articles: twoArticles(),
        articleCount: 'not-a-number' as unknown as number,
      })
    );

    expect(detail.articleCount).toBe(2);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null as unknown as number])(
    'falls back to articles length when cluster articleCount is not a nonnegative safe integer (%p)',
    (articleCount) => {
      const detail = mapClusterDetailToView(
        baseResponse({
          articles: twoArticles(),
          articleCount,
        })
      );

      expect(detail.articleCount).toBe(2);
    }
  );

  it('maps a READY analysis response, including the structured sections', () => {
    const detail = mapClusterDetailToView(baseResponse());

    expect(detail.analysisStatus).toBe('READY');
    expect(detail.analysisIssues).toEqual([]);
    expect(detail.conflictStatus).toBe('NONE');
    expect(detail.sections).toEqual([
      {
        kind: 'background',
        title: '발생 배경',
        paragraphs: [
          {
            sentences: [
              {
                text: 'sentence one',
                sourceArticleIds: [1024],
                conflictStatus: 'NONE',
                conflictingSourceArticleIds: [],
                conflictNote: null,
              },
            ],
          },
        ],
      },
    ]);
    // UTC `Z` converted to a KST display string (A-1-5), NOT the sentinel
    // '-' `updatedAt` falls back to for a missing `lastUpdatedAt`.
    expect(detail.analysisGeneratedAt).toBe('2026-08-13 07:20 KST');
    expect(detail.articleCount).toBe(1);
  });

  it('analysisGeneratedAt is independent from the cluster lastUpdatedAt (A-7)', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({ analysisGeneratedAt: '2026-08-01T00:00:00Z' }),
        lastUpdatedAt: '2026-08-12T22:20:00Z',
      })
    );

    expect(detail.analysisGeneratedAt).not.toBe(detail.updatedAt);
    expect(detail.analysisGeneratedAt).toBe('2026-08-01 09:00 KST');
  });

  it('fails closed when UNAVAILABLE carries conflicting structured analysis fields', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: {
          short: 'short summary',
          long: null,
          analysisStatus: 'UNAVAILABLE',
          // A malformed/inconsistent response for an UNAVAILABLE status —
          // the mapper must not trust these values (A-3 "상태별 처리").
          analysisGeneratedAt: '2026-08-12T22:20:00Z',
          analysisIssues: [
            {
              code: 'NO_GROUNDED_SENTENCES',
              message: '근거를 확인할 수 있는 분석 문장이 없습니다.',
            },
          ],
          conflictStatus: 'FOUND',
          sections: readySummary().sections,
        },
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
  });

  it('forces conflictingSourceArticleIds/conflictNote to empty/null off a non-FOUND sentence', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: 'not checked sentence',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NOT_CHECKED',
                      // Malformed: a NOT_CHECKED sentence should never carry these.
                      conflictingSourceArticleIds: [9999],
                      conflictNote: 'should be dropped',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    const [sentence] = detail.sections[0].paragraphs[0].sentences;
    expect(sentence.conflictingSourceArticleIds).toEqual([]);
    expect(sentence.conflictNote).toBeNull();
    expect(detail.analysisStatus).toBe('PARTIAL');
    expect(detail.analysisIssues).toContainEqual({
      code: 'CONFLICT_CHECK_FAILED',
      message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
    });
  });

  it('downgrades an issue-free READY analysis when a retained sentence is NOT_CHECKED', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '충돌 검사를 확인할 수 없습니다.',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NOT_CHECKED',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.analysisStatus).toBe('PARTIAL');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'CONFLICT_CHECK_FAILED',
        message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.sections[0].paragraphs[0].sentences[0]).toMatchObject({
      conflictStatus: 'NOT_CHECKED',
      conflictingSourceArticleIds: [],
      conflictNote: null,
    });
  });

  it('adds the missing conflict-check issue when PARTIAL omits it for NOT_CHECKED', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          analysisStatus: 'PARTIAL',
          analysisIssues: [],
          sections: [
            {
              kind: 'impact',
              title: '시장 영향',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '충돌 검사가 완료되지 않았습니다.',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NOT_CHECKED',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.analysisStatus).toBe('PARTIAL');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'CONFLICT_CHECK_FAILED',
        message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it('keeps a FOUND sentence intact, including conflicting ids and the note', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          conflictStatus: 'FOUND',
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: 'conflicting sentence',
                      sourceArticleIds: [1024],
                      conflictStatus: 'FOUND',
                      conflictingSourceArticleIds: [2048],
                      conflictNote: '기사별 방향이 다르게 보도됐습니다.',
                    },
                  ],
                },
              ],
            },
          ],
        }),
        articles: [
          ...baseResponse().articles,
          {
            processedArticleId: 2048,
            publisherName: 'Source 2',
            publishedAt: '2026-03-31T06:13:00Z',
            title: 'article 2',
            originLink: 'https://example.com/2',
            naverLink: null,
            ...GROUPING_DEFAULTS,
          },
        ],
      })
    );

    expect(detail.conflictStatus).toBe('FOUND');
    const [sentence] = detail.sections[0].paragraphs[0].sentences;
    expect(sentence.conflictStatus).toBe('FOUND');
    expect(sentence.conflictingSourceArticleIds).toEqual([2048]);
    expect(sentence.conflictNote).toBe('기사별 방향이 다르게 보도됐습니다.');
  });

  it('drops invalid source references without creating controls for unknown article rows', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '근거 기사 하나만 유효합니다.',
                      sourceArticleIds: [9999, 1024, 1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.sections[0].paragraphs[0].sentences[0]).toMatchObject({
      sourceArticleIds: [1024],
      conflictStatus: 'NONE',
      conflictingSourceArticleIds: [],
      conflictNote: null,
    });
  });

  it('downgrades a FOUND sentence when its conflicting references are invalid', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          conflictStatus: 'FOUND',
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '충돌 근거가 유효하지 않습니다.',
                      sourceArticleIds: [1024],
                      conflictStatus: 'FOUND',
                      conflictingSourceArticleIds: [9999],
                      conflictNote: '확인할 수 없는 기사입니다.',
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.sections[0].paragraphs[0].sentences[0]).toMatchObject({
      sourceArticleIds: [1024],
      conflictStatus: 'NOT_CHECKED',
      conflictingSourceArticleIds: [],
      conflictNote: null,
    });
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it.each([
    {
      label: 'unknown article id',
      conflictingSourceArticleIds: [9999],
      conflictNote: '유효한 충돌 설명',
    },
    {
      label: 'duplicate article id',
      conflictingSourceArticleIds: [2048, 2048],
      conflictNote: '유효한 충돌 설명',
    },
    {
      label: 'overlapping supporting article id',
      conflictingSourceArticleIds: [1024],
      conflictNote: '유효한 충돌 설명',
    },
    {
      label: 'non-numeric article id',
      conflictingSourceArticleIds: [2048, 'not-an-id'],
      conflictNote: '유효한 충돌 설명',
    },
    {
      label: 'whitespace-only note',
      conflictingSourceArticleIds: [2048],
      conflictNote: ' \t\n',
    },
    {
      label: 'missing note',
      conflictingSourceArticleIds: [2048],
      conflictNote: undefined,
    },
  ] as const)('marks $label as PARTIAL conflict-check failure', (invalid) => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articles: [
          ...baseResponse().articles,
          {
            processedArticleId: 2048,
            publisherName: 'Source 2',
            publishedAt: '2026-03-31T06:13:00Z',
            title: 'article 2',
            originLink: 'https://example.com/2',
            naverLink: null,
            ...GROUPING_DEFAULTS,
          },
        ],
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '충돌 payload가 유효하지 않습니다.',
                      sourceArticleIds: [1024],
                      conflictStatus: 'FOUND',
                      conflictingSourceArticleIds:
                        invalid.conflictingSourceArticleIds as unknown as number[],
                      conflictNote: invalid.conflictNote as string | null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.analysisStatus).toBe('PARTIAL');
    expect(detail.analysisIssues).toContainEqual({
      code: 'CONFLICT_CHECK_FAILED',
      message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
    });
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.sections[0].paragraphs[0].sentences[0]).toMatchObject({
      conflictStatus: 'NOT_CHECKED',
      conflictingSourceArticleIds: [],
      conflictNote: null,
    });
  });

  it('fails closed when a sentence contains only whitespace', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: ' \t\n',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
  });

  it.each([
    ['blank sentence text', '   '],
    ['non-string sentence text', 42],
  ] as const)('fails closed for %s', (_label, text) => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: {
          ...readySummary(),
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text,
                      sourceArticleIds: [1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        } as unknown as ClusterDetailResponse['summary'],
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it('does not salvage a valid sentence sibling beside a malformed sentence', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: {
          ...readySummary(),
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: 'valid sibling',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                    {
                      text: '  \n',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it.each([
    {
      label: 'non-array sections',
      sections: 'not-an-array',
    },
    {
      label: 'non-array paragraphs',
      sections: [
        {
          kind: 'background',
          title: '발생 배경',
          paragraphs: 'not-an-array',
        },
      ],
    },
    {
      label: 'non-array sentences',
      sections: [
        {
          kind: 'background',
          title: '발생 배경',
          paragraphs: [{ sentences: 'not-an-array' }],
        },
      ],
    },
  ] as const)('fails closed for $label', ({ sections }) => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: {
          ...readySummary(),
          sections,
        } as unknown as ClusterDetailResponse['summary'],
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it.each([
    {
      label: 'non-record section member',
      sections: [null, readySummary().sections[0]],
    },
    {
      label: 'non-record paragraph member',
      sections: [
        {
          ...readySummary().sections[0],
          paragraphs: [null, readySummary().sections[0].paragraphs[0]],
        },
      ],
    },
    {
      label: 'non-record sentence member',
      sections: [
        {
          ...readySummary().sections[0],
          paragraphs: [
            {
              sentences: [
                null,
                readySummary().sections[0].paragraphs[0].sentences[0],
              ],
            },
          ],
        },
      ],
    },
  ] as const)('fails closed for $label', ({ sections }) => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: {
          ...readySummary(),
          sections,
        } as unknown as ClusterDetailResponse['summary'],
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it('keeps PARTIAL conflict-check failures and their restrained sentence state', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          analysisStatus: 'PARTIAL',
          analysisIssues: [
            {
              code: 'CONFLICT_CHECK_FAILED',
              message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
            },
          ],
          conflictStatus: 'NOT_CHECKED',
          sections: [
            {
              kind: 'impact',
              title: '시장 영향',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: '충돌 검사를 완료하지 못했습니다.',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NOT_CHECKED',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.analysisStatus).toBe('PARTIAL');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'CONFLICT_CHECK_FAILED',
        message: '일부 분석 문장의 충돌 근거를 확인하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.sections[0].paragraphs[0].sentences[0].conflictStatus).toBe(
      'NOT_CHECKED'
    );
  });

  it('omits sections that have no paragraphs or sentences', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [],
            },
            {
              kind: 'impact',
              title: '시장 영향',
              paragraphs: [
                {
                  sentences: [],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.sections).toEqual([]);
    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'NO_GROUNDED_SENTENCES',
        message: '근거를 확인할 수 있는 분석 문장이 없습니다.',
      },
    ]);
  });

  it('keeps a structurally valid empty root section list as NO_GROUNDED_SENTENCES', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({ sections: [] }),
      })
    );

    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'NO_GROUNDED_SENTENCES',
        message: '근거를 확인할 수 있는 분석 문장이 없습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it('renders only 2 arriving sections, in arrival order, without a 4-slot layout', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        summary: readySummary({
          sections: [
            {
              kind: 'background',
              title: '발생 배경',
              paragraphs: [
                {
                  sentences: [
                    {
                      text: 'background sentence',
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
                      text: 'outlook sentence',
                      sourceArticleIds: [1024],
                      conflictStatus: 'NONE',
                      conflictingSourceArticleIds: [],
                      conflictNote: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      })
    );

    expect(detail.sections.map((section) => section.kind)).toEqual([
      'background',
      'outlook',
    ]);
  });

  it('fails closed without salvaging valid siblings from malformed analysis structure', () => {
    const malformedResponse = {
      ...baseResponse(),
      summary: {
        short: null,
        long: null,
        analysisStatus: 'READY',
        analysisGeneratedAt: '2026-08-12T22:20:00Z',
        analysisIssues: [{ code: 'UNKNOWN_CODE', message: 'ignored' }],
        conflictStatus: 'UNKNOWN_STATUS',
        sections: [
          { kind: 'unknown-kind', title: '?', paragraphs: [] },
          {
            kind: 'background',
            title: '발생 배경',
            paragraphs: 'not-an-array',
          },
          {
            kind: 'impact',
            title: '시장 영향',
            paragraphs: [
              { sentences: [{ sourceArticleIds: [1024] }] }, // missing text
              {
                sentences: [
                  {
                    text: 'valid sentence',
                    sourceArticleIds: [1024],
                    conflictStatus: 'NONE',
                    conflictingSourceArticleIds: [],
                    conflictNote: null,
                  },
                ],
              },
            ],
          },
        ],
      },
    } as unknown as ClusterDetailResponse;

    expect(() => mapClusterDetailToView(malformedResponse)).not.toThrow();

    const detail = mapClusterDetailToView(malformedResponse);
    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.sections).toEqual([]);
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
  });

  it('defensively maps malformed cluster detail arrays from external DTOs', () => {
    const malformedResponse = {
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: 'AI',
      summary: {
        short: 'fallback summary',
        analysisStatus: 'not-an-enum-value',
        sections: 'not an array',
      },
      representativeArticle: {
        title: 'rep',
        originLink: 'https://example.com',
      },
      articles: 'not an array',
      lastUpdatedAt: '2026-03-31T06:12:00Z',
      articleCount: null,
    } as unknown as ClusterDetailResponse;

    expect(() => mapClusterDetailToView(malformedResponse)).not.toThrow();

    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.tags).toEqual([]);
    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.sections).toEqual([]);
    expect(detail.analysisGeneratedAt).toBeNull();
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.conflictStatus).toBe('NOT_CHECKED');
    expect(detail.articles).toEqual([]);
    expect(detail.articleCount).toBe(0);
  });

  it('normalizes malformed cluster detail text, dates, and links to safe display values', () => {
    const malformedResponse = {
      clusterId: { id: 'cluster-1' },
      businessDate: { date: '2026-03-31' },
      marketType: 'US',
      marketLabel: { label: '미국' },
      title: { text: 'cluster title' },
      tags: ['AI', { tag: 'bad' }],
      summary: {
        short: { text: 'fallback summary' },
        analysisStatus: 'READY',
        analysisGeneratedAt: '2026-08-12T22:20:00Z',
        analysisIssues: [],
        conflictStatus: 'NONE',
        sections: [
          {
            kind: 'background',
            title: '발생 배경',
            paragraphs: [
              {
                sentences: [
                  {
                    text: 'one',
                    sourceArticleIds: [1],
                    conflictStatus: 'NONE',
                    conflictingSourceArticleIds: [],
                    conflictNote: null,
                  },
                  { paragraph: 'bad' },
                ],
              },
            ],
          },
        ],
      },
      representativeArticle: {
        processedArticleId: { id: 1 },
        publisherName: { name: 'publisher' },
        publishedAt: { iso: '2026-03-31T06:12:00Z' },
        title: { text: 'rep' },
        originLink: { href: 'https://example.com' },
        naverLink: { href: 'https://naver.example.com' },
        sourceSummary: { text: 'summary' },
      },
      articles: [
        {
          processedArticleId: 1,
          publisherName: { name: 'publisher' },
          publishedAt: 'not a real date',
          title: { text: 'article' },
          originLink: { href: 'https://example.com/original' },
          naverLink: { href: 'https://example.com/mirror' },
        },
      ],
      lastUpdatedAt: { iso: '2026-03-31T06:12:00Z' },
      articleCount: null,
    } as unknown as ClusterDetailResponse;

    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.id).toBe('unknown-cluster');
    expect(detail.businessDate).toBe('-');
    expect(detail.marketLabel).toBe('시장');
    expect(detail.title).toBe('클러스터 제목이 없습니다.');
    expect(detail.sections).toEqual([]);
    expect(detail.analysisStatus).toBe('UNAVAILABLE');
    expect(detail.analysisIssues).toEqual([
      {
        code: 'ANALYSIS_GENERATION_FAILED',
        message: '분석을 생성하지 못했습니다.',
      },
    ]);
    expect(detail.updatedAt).toBe('-');
    expect(detail.representative).toMatchObject({
      id: 'representative-unknown-cluster',
      // 영어 sentinel을 굽지 않고 null을 보존한다 — 문구 선택은 UI 책임이다.
      source: null,
      publishedAt: null,
      title: null,
      originalUrl: '',
      // naverLink 없음을 originLink로 backfill하지 않는다.
      mirrorUrl: null,
      sourceSummary: '대표 기사 요약이 아직 생성되지 않았습니다.',
    });
    expect(detail.articles[0]).toMatchObject({
      id: '1',
      // 영어 sentinel을 굽지 않고 null을 보존한다 — 문구 선택은 UI 책임이다.
      source: null,
      publishedAt: null,
      title: null,
      originalUrl: '',
      // naverLink 없음을 originLink로 backfill하지 않는다.
      mirrorUrl: null,
    });
  });

  it('keeps valid cluster detail DTO text, dates, and links unchanged', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        representativeArticle: {
          processedArticleId: 7,
          publisherName: 'Publisher',
          publishedAt: '2026-03-31T06:12:00Z',
          title: 'rep',
          originLink: 'https://example.com',
          naverLink: 'https://naver.example.com',
          sourceSummary: 'source summary',
          similarGroupId: 'sim-7',
          isSimilarGroupRepresentative: true,
          exactDuplicateCount: 0,
        },
        articles: [
          {
            processedArticleId: 1,
            publisherName: 'Publisher',
            publishedAt: '2026-03-31T06:13:00Z',
            title: 'article',
            originLink: 'https://example.com/original',
            naverLink: 'https://example.com/mirror',
            similarGroupId: 'sim-1',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 0,
          },
        ],
      })
    );

    expect(detail.id).toBe('cluster-1');
    expect(detail.businessDate).toBe('2026-03-31');
    expect(detail.marketLabel).toBe('미국');
    expect(detail.title).toBe('cluster title');
    expect(detail.representative).toMatchObject({
      id: '7',
      source: 'Publisher',
      title: 'rep',
      originalUrl: 'https://example.com',
      mirrorUrl: 'https://naver.example.com',
      sourceSummary: 'source summary',
    });
    expect(detail.articles[0]).toMatchObject({
      id: '1',
      source: 'Publisher',
      title: 'article',
      originalUrl: 'https://example.com/original',
      mirrorUrl: 'https://example.com/mirror',
    });
    expect(detail.representative.publishedAt).not.toBe('-');
    expect(detail.articles[0].publishedAt).not.toBe('-');
    expect(detail.updatedAt).not.toBe('-');
  });
});

// B-4 유사 기사 그룹 (docs/backend-requests-2026-08-12.md#A-5).
describe('mappers - cluster - B-4 article grouping', () => {
  it('maps similarGroupId, isSimilarGroupRepresentative, and exactDuplicateCount from a READY response', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articleGrouping: {
          status: 'READY',
          generatedAt: '2026-08-12T22:20:00Z',
          issue: null,
        },
        articles: [
          {
            processedArticleId: 1024,
            publisherName: 'Source 1',
            publishedAt: '2026-03-31T06:12:00Z',
            title: 'article 1',
            originLink: 'https://example.com/1',
            naverLink: null,
            similarGroupId: 'sim-cluster-41-1',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 2,
          },
        ],
      })
    );

    expect(detail.articleGrouping).toEqual({
      status: 'READY',
      generatedAt: '2026-08-13 07:20 KST',
      issue: null,
    });
    expect(detail.articles[0]).toMatchObject({
      similarGroupId: 'sim-cluster-41-1',
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: 2,
    });
  });

  it('enforces the UNAVAILABLE invariant (generatedAt null, issue present) even if the response sends conflicting fields', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articleGrouping: {
          status: 'UNAVAILABLE',
          // Malformed/inconsistent response — the mapper must not trust
          // this generatedAt for an UNAVAILABLE status (A-5).
          generatedAt: '2026-08-12T22:20:00Z' as unknown as null,
          issue: null,
        },
      })
    );

    expect(detail.articleGrouping.status).toBe('UNAVAILABLE');
    expect(detail.articleGrouping.generatedAt).toBeNull();
    expect(detail.articleGrouping.issue).not.toBeNull();
    expect(detail.articleGrouping.issue?.code).toBe(
      'SIMILARITY_GROUPING_FAILED'
    );
  });

  it('maps a real UNAVAILABLE issue message verbatim', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articleGrouping: {
          status: 'UNAVAILABLE',
          generatedAt: null,
          issue: {
            code: 'SIMILARITY_GROUPING_FAILED',
            message: '유사 기사 묶음을 생성하지 못했습니다.',
          },
        },
      })
    );

    expect(detail.articleGrouping).toEqual({
      status: 'UNAVAILABLE',
      generatedAt: null,
      issue: {
        code: 'SIMILARITY_GROUPING_FAILED',
        message: '유사 기사 묶음을 생성하지 못했습니다.',
      },
    });
  });

  it('defaults a malformed/missing articleGrouping to UNAVAILABLE with a fallback issue, never throwing', () => {
    const malformedResponse = {
      ...baseResponse(),
      articleGrouping: undefined,
    } as unknown as ClusterDetailResponse;

    expect(() => mapClusterDetailToView(malformedResponse)).not.toThrow();
    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.articleGrouping.status).toBe('UNAVAILABLE');
    expect(detail.articleGrouping.generatedAt).toBeNull();
    expect(detail.articleGrouping.issue).not.toBeNull();
  });

  it('defensively defaults a malformed article-level grouping field to a unique singleton, never sharing a fallback id across articles', () => {
    const malformedResponse = {
      ...baseResponse(),
      articles: [
        {
          processedArticleId: 1,
          title: 'article 1',
          originLink: 'https://example.com/1',
          // similarGroupId/isSimilarGroupRepresentative/exactDuplicateCount
          // all missing — must not crash and must not collapse into a
          // group shared with article 2 below.
        },
        {
          processedArticleId: 2,
          title: 'article 2',
          originLink: 'https://example.com/2',
        },
      ],
    } as unknown as ClusterDetailResponse;

    const detail = mapClusterDetailToView(malformedResponse);

    expect(detail.articles).toHaveLength(2);
    expect(detail.articles[0].similarGroupId).not.toBe(
      detail.articles[1].similarGroupId
    );
    expect(detail.articles[0].isSimilarGroupRepresentative).toBe(true);
    expect(detail.articles[0].exactDuplicateCount).toBe(0);
  });

  it('downgrades an inconsistent READY grouping payload to UNAVAILABLE instead of exposing collapse UI', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articleGrouping: READY_GROUPING,
        articles: [
          {
            processedArticleId: 1,
            publisherName: 'Source 1',
            publishedAt: '2026-03-31T06:12:00Z',
            title: 'article 1',
            originLink: 'https://example.com/1',
            naverLink: null,
            similarGroupId: 'sim-shared',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 4,
          },
          {
            processedArticleId: 2,
            publisherName: 'Source 2',
            publishedAt: '2026-03-31T06:13:00Z',
            title: 'article 2',
            originLink: 'https://example.com/2',
            naverLink: null,
            similarGroupId: 'sim-shared',
            // Two representatives violate the B-4 invariant.
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 0,
          },
        ],
      })
    );

    expect(detail.articleGrouping.status).toBe('UNAVAILABLE');
    expect(detail.articleGrouping.generatedAt).toBeNull();
    expect(detail.articleGrouping.issue?.code).toBe(
      'SIMILARITY_GROUPING_FAILED'
    );
    // Raw counts remain attached to their source articles even on fallback.
    expect(
      detail.articles.map((article) => article.exactDuplicateCount)
    ).toEqual([4, 0]);
  });

  it('downgrades a READY envelope with an invalid generatedAt or issue to UNAVAILABLE', () => {
    const detail = mapClusterDetailToView(
      baseResponse({
        articleGrouping: {
          status: 'READY',
          generatedAt: null,
          issue: {
            code: 'SIMILARITY_GROUPING_FAILED',
            message: 'unexpected issue',
          },
        } as unknown as ClusterDetailResponse['articleGrouping'],
      })
    );

    expect(detail.articleGrouping.status).toBe('UNAVAILABLE');
    expect(detail.articleGrouping.generatedAt).toBeNull();
    expect(detail.articleGrouping.issue?.code).toBe(
      'SIMILARITY_GROUPING_FAILED'
    );
  });
});
