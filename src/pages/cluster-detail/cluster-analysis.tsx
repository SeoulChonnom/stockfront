import { useMemo } from 'react';

import { InlineAlert } from '@/components/state';
import { cn } from '@/lib/utils';

import type {
  AnalysisIssue,
  AnalysisStatus,
  ClusterArticle,
  ClusterParagraph,
  ClusterSection,
  ClusterSentence,
  ConflictStatus,
} from '../../lib/view-models';
import { requestArticleFocus } from './article-focus-event';
import { displaySource } from './copy-fallbacks';

/**
 * "AI 심층 분석" renders `summary.long` (as `analysisLead`) followed by the
 * server's structured `sections[] → paragraphs[] → sentences[]` (B-2,
 * docs/backend-requests-2026-08-12.md#A-3). The server fixes every
 * `section.kind`/`title` and their order — this component renders only the
 * sections that arrived, in arrival order, and never infers a subheading
 * from paragraph text.
 *
 * `analysisStatus === 'UNAVAILABLE'` replaces the section area with a
 * single guidance state instead of four empty headings; `analysisLead`
 * (`summary.long`) still renders above it, since the server guarantees it
 * can be valid independent of analysis success (A-3 "UNAVAILABLE 렌더 주의").
 */
export function ClusterAnalysis({
  analysisStatus,
  analysisGeneratedAt,
  analysisIssues,
  conflictStatus,
  sections,
  analysisLead,
  articles,
}: {
  analysisStatus: AnalysisStatus;
  analysisGeneratedAt: string | null;
  analysisIssues: AnalysisIssue[];
  conflictStatus: ConflictStatus;
  sections: ClusterSection[];
  analysisLead: string | null;
  articles: ClusterArticle[];
}) {
  const articleLookup = useMemo(
    () => new Map(articles.map((article) => [article.id, article])),
    [articles]
  );

  return (
    <section
      aria-labelledby='cluster-analysis-heading'
      className='min-w-0 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-[18px]'
    >
      <div className='mb-3 flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h2
          className='m-0 text-card-heading font-semibold text-fg'
          id='cluster-analysis-heading'
        >
          AI 심층 분석
        </h2>
        {analysisGeneratedAt ? (
          <span className='mono text-body-sm text-faint'>
            생성 기준 {analysisGeneratedAt}
          </span>
        ) : null}
        {conflictStatus === 'FOUND' ? (
          <span className='inline-flex items-center rounded-[var(--r-sm)] border border-[color:var(--info-line)] bg-[color:var(--info-soft)] px-1.5 py-0.5 text-caption font-semibold text-[color:var(--info)]'>
            상충하는 보도가 있음
          </span>
        ) : null}
        <a
          className='ms-auto inline-flex min-h-tap items-center text-body-sm text-fg-soft underline underline-offset-2'
          href='#cluster-articles-heading'
        >
          근거 기사 보기
        </a>
      </div>

      {/* Only shown while the analysis is otherwise present — under
          UNAVAILABLE the guidance state below already covers "확인되지
          않음"; repeating it here would be redundant, not informative. */}
      {conflictStatus === 'NOT_CHECKED' && analysisStatus !== 'UNAVAILABLE' ? (
        <p className='m-0 mb-3 text-caption text-faint'>
          이 분석은 근거 충돌 여부를 확인하지 못했습니다.
        </p>
      ) : null}

      {analysisLead ? (
        <p className='measure-analysis wrap-anywhere m-0 mb-3 text-body text-fg'>
          {analysisLead}
        </p>
      ) : null}

      {analysisStatus === 'UNAVAILABLE' ? (
        <InlineAlert title='심층 분석을 표시할 수 없습니다' tone='info'>
          <p className='m-0'>
            이 이슈는 근거를 확인할 수 있는 분석 문장이 없습니다.
          </p>
          {analysisIssues.length > 0 ? (
            <ul className='m-0 mt-2 list-none space-y-1 p-0'>
              {analysisIssues.map((issue) => (
                <li key={issue.code}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </InlineAlert>
      ) : (
        <div className='flex flex-col gap-4'>
          {analysisStatus === 'PARTIAL' && analysisIssues.length > 0 ? (
            <InlineAlert ariaLive='polite' tone='warning'>
              <ul className='m-0 flex list-none flex-col gap-1 p-0'>
                {analysisIssues.map((issue) => (
                  <li key={issue.code}>{issue.message}</li>
                ))}
              </ul>
            </InlineAlert>
          ) : null}

          {sections.map((section) => (
            <AnalysisSectionBlock
              articleLookup={articleLookup}
              key={section.kind}
              section={section}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnalysisSectionBlock({
  section,
  articleLookup,
}: {
  section: ClusterSection;
  articleLookup: Map<string, ClusterArticle>;
}) {
  return (
    <div className='min-w-0'>
      <h3 className='m-0 mb-2 text-[13px] font-semibold tracking-[0.05em] text-faint uppercase'>
        {section.title}
      </h3>
      <div className='flex flex-col gap-3 border-l-2 border-[color:var(--line-strong)] pl-3'>
        {section.paragraphs.map((paragraph, index) => (
          <ParagraphBlock
            articleLookup={articleLookup}
            // Paragraphs carry no server-issued id; a two-paragraph section
            // can share the same opening text, so the index disambiguates.
            // biome-ignore lint/suspicious/noArrayIndexKey: stateless read-only list, index disambiguates equal prefixes
            key={`${index}-${paragraph.sentences[0]?.text.slice(0, 24)}`}
            paragraph={paragraph}
          />
        ))}
      </div>
    </div>
  );
}

function ParagraphBlock({
  paragraph,
  articleLookup,
}: {
  paragraph: ClusterParagraph;
  articleLookup: Map<string, ClusterArticle>;
}) {
  const foundSentences = paragraph.sentences.filter(
    (sentence) => sentence.conflictStatus === 'FOUND'
  );

  return (
    <div className='flex flex-col gap-2'>
      <p className='measure-analysis wrap-anywhere m-0 text-body text-fg-soft leading-[1.65]'>
        {paragraph.sentences.map((sentence, index) => (
          <SentenceText
            articleLookup={articleLookup}
            // biome-ignore lint/suspicious/noArrayIndexKey: stateless read-only list, index disambiguates equal prefixes
            key={`${index}-${sentence.text.slice(0, 24)}`}
            sentence={sentence}
          />
        ))}
      </p>
      {foundSentences.map((sentence, index) => (
        <ConflictDetail
          articleLookup={articleLookup}
          // biome-ignore lint/suspicious/noArrayIndexKey: stateless read-only list, index disambiguates equal prefixes
          key={`${index}-${sentence.text.slice(0, 24)}`}
          sentence={sentence}
        />
      ))}
    </div>
  );
}

function SentenceText({
  sentence,
  articleLookup,
}: {
  sentence: ClusterSentence;
  articleLookup: Map<string, ClusterArticle>;
}) {
  // A FOUND sentence gets its citations from `ConflictDetail` below instead
  // (grouped and tone-differentiated into 지지/상충) — repeating plain,
  // undifferentiated inline citations here would duplicate the same
  // article reference under two different-looking controls.
  const showInlineCitations = sentence.conflictStatus !== 'FOUND';

  return (
    <>
      {sentence.text}
      {showInlineCitations
        ? sentence.sourceArticleIds.map((articleId) => (
            <CitationButton
              articleId={articleId}
              articleLookup={articleLookup}
              key={articleId}
              tone='support'
            />
          ))
        : null}{' '}
    </>
  );
}

/**
 * `FOUND` is a normal analysis result, not an error (A-3 "충돌 표시") —
 * `info` tone throughout, never `danger`/`warning`. Supporting and
 * conflicting citations are grouped and styled distinctly so a reader can
 * tell which article said what; `conflictNote` is rendered verbatim and
 * never adjudicates which side is correct.
 */
function ConflictDetail({
  sentence,
  articleLookup,
}: {
  sentence: ClusterSentence;
  articleLookup: Map<string, ClusterArticle>;
}) {
  return (
    <div className='rounded-[var(--r-md)] border border-[color:var(--info-line)] bg-[color:var(--info-soft)] p-3'>
      <p className='m-0 mb-2 flex items-center gap-1.5 text-[color:var(--info)] text-caption font-semibold'>
        <span aria-hidden='true'>i</span>
        상충하는 보도가 있음
      </p>
      <div className='flex flex-col gap-1.5'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-caption font-semibold text-faint'>
            지지 기사
          </span>
          {sentence.sourceArticleIds.map((articleId) => (
            <CitationButton
              articleId={articleId}
              articleLookup={articleLookup}
              key={articleId}
              tone='support'
            />
          ))}
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='text-caption font-semibold text-faint'>
            상충 기사
          </span>
          {sentence.conflictingSourceArticleIds.map((articleId) => (
            <CitationButton
              articleId={articleId}
              articleLookup={articleLookup}
              key={articleId}
              tone='conflict'
            />
          ))}
        </div>
        {sentence.conflictNote ? (
          <p className='wrap-anywhere m-0 text-body-sm text-fg-soft'>
            {sentence.conflictNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Scrolls to and focuses the referenced article's row in
 * `ClusterArticlesList` on the same screen (A-3 "근거 기사 참조 UX") —
 * never a navigation to the external original article; the row's own link
 * still handles that. A referenced id not existing in this response's
 * `articles[]` cannot happen per the server guarantee (A-3 "보장").
 *
 * The row may still be absent from the DOM despite existing in the
 * response — B-4's similar-article grouping (A-5) can collapse it inside
 * an unexpanded group. When the direct lookup misses, this asks
 * `ClusterArticlesList` (via `requestArticleFocus`) to expand the
 * containing group and retry, rather than silently no-oping.
 */
function focusArticleRow(articleId: number) {
  const target = document.getElementById(`cluster-article-${articleId}`);

  if (target) {
    target.focus({ preventScroll: true });
    // jsdom does not implement scrollIntoView (see archive-search-page.tsx).
    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  requestArticleFocus(articleId);
}

function CitationButton({
  articleId,
  articleLookup,
  tone,
}: {
  articleId: number;
  articleLookup: Map<string, ClusterArticle>;
  tone: 'support' | 'conflict';
}) {
  const article = articleLookup.get(String(articleId));
  if (!article) {
    return null;
  }

  const label = displaySource(article.source);
  const articleTitle = article.title ?? label;

  return (
    <button
      aria-label={`근거 기사로 이동: ${articleTitle}`}
      className={cn(
        'ms-1 inline-flex min-h-5 items-center rounded-[var(--r-sm)] border px-1.5 py-0.5 align-middle text-[11px] font-medium leading-none first:ms-0',
        tone === 'conflict'
          ? 'border-[color:var(--info-line)] bg-[color:var(--surface)] text-[color:var(--info)]'
          : 'border-[color:var(--line-strong)] bg-[color:var(--surface-2)] text-fg-soft hover:bg-[color:var(--surface-3)]'
      )}
      onClick={() => focusArticleRow(articleId)}
      type='button'
    >
      {label}
    </button>
  );
}
