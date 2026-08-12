import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClusterAnalysis } from './cluster-analysis';

describe('ClusterAnalysis', () => {
  it('states when the analysis was generated', () => {
    render(
      <ClusterAnalysis
        analysis={['첫 문단']}
        analysisLead='도입'
        generatedAt='2026-08-12 07:20'
      />
    );

    expect(screen.getByText(/2026-08-12 07:20/)).toBeInTheDocument();
  });

  it('renders the lead and the body paragraphs at the same size', () => {
    render(
      <ClusterAnalysis
        analysis={['본문 문단']}
        analysisLead='도입 문단'
        generatedAt={null}
      />
    );

    const lead = screen.getByText('도입 문단');
    const body = screen.getByText('본문 문단');

    expect(lead).toHaveClass('text-body');
    expect(body).toHaveClass('text-body');
  });

  it('links to the source articles section', () => {
    render(
      <ClusterAnalysis analysis={[]} analysisLead={null} generatedAt={null} />
    );

    expect(screen.getByRole('link', { name: /근거 기사/ })).toHaveAttribute(
      'href',
      '#cluster-articles-heading'
    );
  });
});
