import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PipelineStages } from './pipeline-stages';

/**
 * `currentStep` (docs/api_spec.json) replaced the old "honest guess" that
 * always marked 뉴스 수집 running for any RUNNING/PENDING job — see
 * `docs/design_v2/v2-decisions.md` §10-1. These tests cover the new
 * currentStep-matching behavior, the type-specific 6-stage lists, and the
 * unmatched-currentStep "확인 불가" fallback (never guessing which stage is
 * live when the signal doesn't match a known stage name).
 */
describe('PipelineStages', () => {
  it('renders nothing for an unrecognized jobType (never invents a stage list)', () => {
    const { container } = render(
      <PipelineStages jobStatus='RUNNING' jobType='SOME_FUTURE_TYPE' />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders NEWS_COLLECTION's 6-stage list, distinct from MARKET_SNAPSHOT's", () => {
    render(<PipelineStages jobStatus='SUCCESS' jobType='NEWS_COLLECTION' />);

    expect(screen.getByText('작업 생성')).toBeInTheDocument();
    expect(screen.getByText('뉴스 수집')).toBeInTheDocument();
    expect(screen.getByText('지수 수집')).toBeInTheDocument();
    expect(screen.getByText('중복 제거')).toBeInTheDocument();
    expect(screen.getByText('검색 결과 저장')).toBeInTheDocument();
    expect(screen.getByText('작업 종료')).toBeInTheDocument();
    // MARKET_SNAPSHOT-only stages must not leak into this list.
    expect(screen.queryByText('클러스터 구성')).not.toBeInTheDocument();
    expect(screen.queryByText('페이지 스냅샷')).not.toBeInTheDocument();
  });

  it("renders MARKET_SNAPSHOT's 6-stage list, distinct from NEWS_COLLECTION's", () => {
    render(<PipelineStages jobStatus='SUCCESS' jobType='MARKET_SNAPSHOT' />);

    expect(screen.getByText('작업 생성')).toBeInTheDocument();
    expect(screen.getByText('검색 결과 적재')).toBeInTheDocument();
    expect(screen.getByText('클러스터 구성')).toBeInTheDocument();
    expect(screen.getByText('AI 요약 생성')).toBeInTheDocument();
    expect(screen.getByText('페이지 스냅샷')).toBeInTheDocument();
    expect(screen.getByText('작업 종료')).toBeInTheDocument();
    // NEWS_COLLECTION-only stages must not leak into this list.
    expect(screen.queryByText('뉴스 수집')).not.toBeInTheDocument();
    expect(screen.queryByText('검색 결과 저장')).not.toBeInTheDocument();
  });

  it('marks the stage matching `currentStep` as 실행 중, earlier stages 성공, later stages 대기', () => {
    render(
      <PipelineStages
        currentStep='클러스터 구성'
        jobStatus='RUNNING'
        jobType='MARKET_SNAPSHOT'
      />
    );

    const items = screen.getAllByRole('listitem');
    const byName = (name: string) =>
      items.find((item) => item.textContent?.startsWith(name));

    expect(byName('작업 생성')?.textContent).toContain('성공');
    expect(byName('검색 결과 적재')?.textContent).toContain('성공');
    expect(byName('클러스터 구성')?.textContent).toContain('실행 중');
    expect(byName('AI 요약 생성')?.textContent).toContain('대기');
    expect(byName('페이지 스냅샷')?.textContent).toContain('대기');
    expect(byName('작업 종료')?.textContent).toContain('대기');
  });

  it('matches `currentStep` by snake_case stage key, not just the Korean label', () => {
    // `docs/api_spec.json`은 currentStep의 wire 형식을 명시하지 않지만,
    // 디자인 핸드오프의 `BATCH_STAGES` key와 로그 픽스처(`step=
    // load_search_result`)는 백엔드 식별자가 snake_case key임을 시사한다.
    // 라벨로만 매칭하면 실제 백엔드에서는 항상 "확인 불가"로 떨어진다.
    render(
      <PipelineStages
        currentStep='load_search_result'
        jobStatus='RUNNING'
        jobType='MARKET_SNAPSHOT'
      />
    );

    const items = screen.getAllByRole('listitem');
    const byName = (name: string) =>
      items.find((item) => item.textContent?.startsWith(name));

    expect(byName('작업 생성')?.textContent).toContain('성공');
    expect(byName('검색 결과 적재')?.textContent).toContain('실행 중');
    expect(byName('클러스터 구성')?.textContent).toContain('대기');
    expect(screen.queryByText('확인 불가')).not.toBeInTheDocument();
  });

  it('another jobType’s stage key must not match by accident', () => {
    render(
      <PipelineStages
        // NEWS_COLLECTION 전용 key를 MARKET_SNAPSHOT 작업에 줬을 때.
        currentStep='collect_news'
        jobStatus='RUNNING'
        jobType='MARKET_SNAPSHOT'
      />
    );

    expect(screen.queryByText('실행 중')).not.toBeInTheDocument();
    expect(screen.getAllByText('확인 불가').length).toBeGreaterThan(0);
  });

  it('falls back to 확인 불가 (marking no stage as running) when currentStep is null', () => {
    render(
      <PipelineStages
        currentStep={null}
        jobStatus='RUNNING'
        jobType='MARKET_SNAPSHOT'
      />
    );

    expect(screen.queryByText('실행 중')).not.toBeInTheDocument();
    expect(screen.getAllByText('확인 불가').length).toBeGreaterThan(0);
  });

  it("falls back to 확인 불가 when currentStep doesn't match any known stage name for this jobType", () => {
    render(
      <PipelineStages
        // A NEWS_COLLECTION-only stage name given for a MARKET_SNAPSHOT job
        // — must not match by accident.
        currentStep='뉴스 수집'
        jobStatus='PENDING'
        jobType='MARKET_SNAPSHOT'
      />
    );

    expect(screen.queryByText('실행 중')).not.toBeInTheDocument();
    expect(screen.getAllByText('확인 불가').length).toBeGreaterThan(0);
  });

  it('per-stage duration is always "-" (the spec still has no per-stage timing)', () => {
    render(
      <PipelineStages
        currentStep='뉴스 수집'
        jobStatus='RUNNING'
        jobType='NEWS_COLLECTION'
      />
    );

    const dashes = screen.getAllByText('-');
    expect(dashes).toHaveLength(6);
  });

  it('infers the failed stage from an errorCode keyword, scoped to this jobType’s own stage list', () => {
    render(
      <PipelineStages
        errorCode='AI_SUMMARY_TIMEOUT'
        jobStatus='FAILED'
        jobType='MARKET_SNAPSHOT'
      />
    );

    const items = screen.getAllByRole('listitem');
    const byName = (name: string) =>
      items.find((item) => item.textContent?.startsWith(name));

    expect(byName('AI 요약 생성')?.textContent).toContain('실패');
    expect(byName('페이지 스냅샷')?.textContent).toContain('건너뜀');
  });

  it('falls back to 확인 불가 for FAILED when the errorCode keyword resolves to a stage this jobType does not have', () => {
    // /CLUSTER/ matches '클러스터 구성', which only exists in
    // MARKET_SNAPSHOT's list — for a NEWS_COLLECTION job this must not
    // silently pick a wrong index.
    render(
      <PipelineStages
        errorCode='CLUSTER_BUILD_ERROR'
        jobStatus='FAILED'
        jobType='NEWS_COLLECTION'
      />
    );

    expect(screen.queryByText('실패')).not.toBeInTheDocument();
    expect(screen.getAllByText('확인 불가').length).toBeGreaterThan(0);
  });

  it('always shows the PROPOSED · BACKEND badge when a known jobType renders', () => {
    render(<PipelineStages jobStatus='SUCCESS' jobType='NEWS_COLLECTION' />);

    expect(screen.getByText('PROPOSED · BACKEND')).toBeInTheDocument();
  });
});
