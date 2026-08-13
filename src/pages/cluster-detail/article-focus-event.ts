/**
 * Cross-component bridge between B-2's "근거 기사로 이동" citations
 * (`cluster-analysis.tsx`, A-3 "근거 기사 참조 UX") and B-4's similar-article
 * grouping (`cluster-articles-list.tsx`, A-5), which can collapse the
 * target article's row out of the DOM.
 *
 * `ClusterAnalysis` owns the citation buttons; `ClusterArticlesList` owns
 * group collapse state. Neither imports the other — a `CustomEvent` on
 * `document` connects them without lifting collapse state up to
 * `cluster-detail-page.tsx`. `ClusterAnalysis` still tries a direct
 * `getElementById` + focus first (unchanged, and covered by
 * `cluster-analysis.test.tsx`'s pre-existing synchronous-focus assertions);
 * this event only fires when that lookup misses, i.e. the row isn't
 * currently rendered.
 */
export const ARTICLE_FOCUS_REQUEST_EVENT = 'cluster-article-focus-request';

export type ArticleFocusRequestDetail = { articleId: number };

export function requestArticleFocus(articleId: number): void {
  document.dispatchEvent(
    new CustomEvent<ArticleFocusRequestDetail>(ARTICLE_FOCUS_REQUEST_EVENT, {
      detail: { articleId },
    })
  );
}
