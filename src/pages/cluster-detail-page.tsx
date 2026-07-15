import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  FileText,
  PanelsTopLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { InfoRow, PageMessage } from '../components/ui';
import { createNavigateHandler } from '../lib/app-state';
import { useClusterDetail } from '../lib/query-hooks';
import { navigate } from '../lib/router';

function getSafeExternalUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? url
      : null;
  } catch {
    return null;
  }
}

export function ClusterDetailPage({ clusterId }: { clusterId: string }) {
  const clusterQuery = useClusterDetail(clusterId);

  if (clusterQuery.isLoading) {
    return (
      <PageMessage
        description='뉴스 클러스터 상세를 불러오는 중입니다.'
        title='Loading Cluster Detail'
      />
    );
  }

  if (clusterQuery.error) {
    return (
      <PageMessage
        description={clusterQuery.error.message}
        title='Cluster Detail Unavailable'
      />
    );
  }

  if (!clusterQuery.data) {
    return (
      <PageMessage
        description='표시할 클러스터 데이터가 없습니다.'
        title='No Cluster Data'
      />
    );
  }

  const detail = clusterQuery.data;
  const representativeOriginalUrl = getSafeExternalUrl(
    detail.representative.originalUrl
  );
  const representativeMirrorUrl = getSafeExternalUrl(
    detail.representative.mirrorUrl
  );

  return (
    <div className='page-stack'>
      <section className='page-intro'>
        <div>
          <nav className='breadcrumb' aria-label='Breadcrumb'>
            <span>{detail.marketLabel}</span>
            <ChevronRight size={14} />
            <span>{detail.businessDate}</span>
            <ChevronRight size={14} />
            <span className='current'>뉴스 클러스터 상세</span>
          </nav>
          <h1 id='page-title' tabIndex={-1}>
            {detail.title}
          </h1>
          <div className='tag-row'>
            {detail.tags.map((tag) => (
              <span className='soft-chip' key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className='detail-grid'>
        <div className='detail-main'>
          <section className='panel insight-panel'>
            <div className='panel-header'>
              <Sparkles size={18} />
              <h2>AI 심층 분석 리포트</h2>
            </div>
            <div className='prose-copy'>
              {detail.analysis.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className='section-stack'>
            <div className='section-header'>
              <div>
                <h3>관련 뉴스 타임라인</h3>
                <p>
                  원문 링크와 미러 링크를 분리해 액션 의미를 명확히 유지합니다.
                </p>
              </div>
              <div className='section-line' />
            </div>
            <div className='timeline-list'>
              {detail.articles.map((article) => {
                const originalUrl = getSafeExternalUrl(article.originalUrl);
                const mirrorUrl = getSafeExternalUrl(article.mirrorUrl);

                return (
                  <Card className='panel timeline-card' key={article.id}>
                    <CardContent className='grid gap-4 p-6'>
                      <div className='timeline-card-copy'>
                        <div className='timeline-meta'>
                          <strong>{article.source}</strong>
                          <span />
                          <time>{article.publishedAt}</time>
                        </div>
                        <h4>{article.title}</h4>
                      </div>
                      <div className='action-row'>
                        {originalUrl ? (
                          <Button asChild variant='secondary'>
                            <a
                              href={originalUrl}
                              rel='noopener noreferrer'
                              target='_blank'
                            >
                              <ExternalLink size={15} />
                              Original Link
                            </a>
                          </Button>
                        ) : null}
                        {mirrorUrl ? (
                          <Button asChild variant='ghost'>
                            <a
                              href={mirrorUrl}
                              rel='noopener noreferrer'
                              target='_blank'
                            >
                              <FileText size={15} />
                              Naver Mirror
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </div>

        <aside className='detail-aside'>
          <div className='sticky-stack'>
            <section className='panel representative-card'>
              <div className='representative-visual'>
                <div className='visual-badge'>HEADLINE</div>
                <PanelsTopLeft className='visual-icon' size={30} />
              </div>
              <div className='representative-content'>
                <div className='representative-meta'>
                  <span className='soft-chip'>
                    {detail.representative.source}
                  </span>
                  <time>{detail.representative.publishedAt}</time>
                </div>
                <h3>{detail.representative.title}</h3>
                <p>{detail.representative.sourceSummary}</p>
                <div className='action-column'>
                  {representativeOriginalUrl ? (
                    <a
                      className='button button-primary'
                      href={representativeOriginalUrl}
                      rel='noopener noreferrer'
                      target='_blank'
                    >
                      <ExternalLink size={15} />
                      Original Link
                    </a>
                  ) : null}
                  {representativeMirrorUrl ? (
                    <a
                      className='button button-secondary'
                      href={representativeMirrorUrl}
                      rel='noopener noreferrer'
                      target='_blank'
                    >
                      <FileText size={15} />
                      Naver Mirror
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className='panel metric-list'>
              <InfoRow
                label='클러스터 뉴스 수'
                value={`${detail.articleCount}건`}
              />
              <InfoRow label='최종 업데이트' value={detail.updatedAt} />
              <InfoRow label='Business Date' value={detail.businessDate} />
            </section>
          </div>
        </aside>
      </div>

      <footer className='detail-footer'>
        <Button
          onClick={() => navigate('/market/archive/search')}
          type='button'
          variant='ghost'
        >
          <ArrowLeft size={16} />
          이전 화면으로
        </Button>
        <Button asChild variant='secondary'>
          <a
            href={`/market/archive/${detail.businessDate}`}
            onClick={createNavigateHandler(
              `/market/archive/${detail.businessDate}`
            )}
          >
            <CalendarDays size={16} />
            같은 날짜 페이지로 이동
          </a>
        </Button>
      </footer>
    </div>
  );
}
