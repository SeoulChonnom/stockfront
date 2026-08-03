import { describe, expect, it } from 'vitest';
import type { ClusterDetailResponse } from '../api/types';
import { mapClusterDetailToView } from './cluster';

describe('mappers - cluster', () => {
  it('falls back to articles length when cluster articleCount is malformed', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketLabel: '미국',
      title: 'cluster title',
      tags: [],
      analysis: ['analysis paragraph'],
      articles: [
        {
          processedArticleId: 'article-1',
          publisherName: 'Source 1',
          publishedAt: '2026-03-31T06:12:00Z',
          title: 'article 1',
          originLink: 'https://example.com/1',
          naverLink: 'https://example.com/1-mirror',
        },
        {
          processedArticleId: 'article-2',
          publisherName: 'Source 2',
          publishedAt: '2026-03-31T06:13:00Z',
          title: 'article 2',
          originLink: 'https://example.com/2',
          naverLink: 'https://example.com/2-mirror',
        },
      ],
      representativeArticle: {
        processedArticleId: 'rep',
        publisherName: 'Representative Source',
        publishedAt: '2026-03-31T06:14:00Z',
        title: 'representative article',
        originLink: 'https://example.com/rep',
        naverLink: 'https://example.com/rep-mirror',
      },
      articleCount: 'not-a-number',
      updatedAt: '2026-03-31T06:15:00Z',
    } as unknown as ClusterDetailResponse);

    expect(detail.articleCount).toBe(2);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null])(
    'falls back to articles length when cluster articleCount is not a nonnegative safe integer (%p)',
    (articleCount) => {
      const detail = mapClusterDetailToView({
        clusterId: 'cluster-1',
        businessDate: '2026-03-31',
        marketLabel: '미국',
        title: 'cluster title',
        tags: [],
        analysis: ['analysis paragraph'],
        articles: [
          {
            processedArticleId: 'article-1',
            publisherName: 'Source 1',
            publishedAt: '2026-03-31T06:12:00Z',
            title: 'article 1',
            originLink: 'https://example.com/1',
            naverLink: 'https://example.com/1-mirror',
          },
          {
            processedArticleId: 'article-2',
            publisherName: 'Source 2',
            publishedAt: '2026-03-31T06:13:00Z',
            title: 'article 2',
            originLink: 'https://example.com/2',
            naverLink: 'https://example.com/2-mirror',
          },
        ],
        representativeArticle: {
          processedArticleId: 'rep',
          publisherName: 'Representative Source',
          publishedAt: '2026-03-31T06:14:00Z',
          title: 'representative article',
          originLink: 'https://example.com/rep',
          naverLink: 'https://example.com/rep-mirror',
        },
        articleCount,
        updatedAt: '2026-03-31T06:15:00Z',
      } as unknown as ClusterDetailResponse);

      expect(detail.articleCount).toBe(2);
    }
  );

  it('maps cluster detail response', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: ['AI'],
      summary: {
        analysis: ['one'],
      },
      representativeArticle: {
        title: 'rep',
        originLink: 'https://example.com',
      },
      articles: [
        {
          processedArticleId: 1,
          title: 'article',
          originLink: 'https://example.com',
        },
      ],
      lastUpdatedAt: '2026-03-31T06:12:00Z',
      articleCount: null,
    });

    expect(detail.analysis).toEqual(['one']);
    expect(detail.articleCount).toBe(1);
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
        analysis: 'not an array',
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
    expect(detail.analysis).toEqual([]);
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
        analysis: ['one', { paragraph: 'bad' }],
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
    expect(detail.analysis).toEqual(['one']);
    expect(detail.updatedAt).toBe('-');
    expect(detail.representative).toMatchObject({
      id: 'representative-unknown-cluster',
      // 영어 sentinel을 굽지 않고 null을 보존한다 — 문구 선택은 UI 책임 (§7-5).
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
      // 영어 sentinel을 굽지 않고 null을 보존한다 — 문구 선택은 UI 책임 (§7-5).
      source: null,
      publishedAt: null,
      title: null,
      originalUrl: '',
      // naverLink 없음을 originLink로 backfill하지 않는다.
      mirrorUrl: null,
    });
  });

  it('keeps valid cluster detail DTO text, dates, and links unchanged', () => {
    const detail = mapClusterDetailToView({
      clusterId: 'cluster-1',
      businessDate: '2026-03-31',
      marketType: 'US',
      marketLabel: '미국',
      title: 'cluster title',
      tags: ['AI'],
      summary: {
        short: 'summary',
        analysis: ['one'],
      },
      representativeArticle: {
        processedArticleId: 7,
        publisherName: 'Publisher',
        publishedAt: '2026-03-31T06:12:00Z',
        title: 'rep',
        originLink: 'https://example.com',
        naverLink: 'https://naver.example.com',
        sourceSummary: 'source summary',
      },
      articles: [
        {
          processedArticleId: 1,
          publisherName: 'Publisher',
          publishedAt: '2026-03-31T06:13:00Z',
          title: 'article',
          originLink: 'https://example.com/original',
          naverLink: 'https://example.com/mirror',
        },
      ],
      lastUpdatedAt: '2026-03-31T06:14:00Z',
      articleCount: 1,
    });

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
