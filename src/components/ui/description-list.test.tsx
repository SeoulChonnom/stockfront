import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DescriptionList, DescriptionListItem } from './description-list';

describe('DescriptionList', () => {
  it('renders labels and values with definition-list semantics and responsive layout', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionListItem label='시작' value='06:10:00' />
        <DescriptionListItem label='상태' value={<span>성공</span>} />
      </DescriptionList>
    );

    const list = container.querySelector('dl');
    expect(list).toBeInTheDocument();
    expect(list).toHaveClass(
      'm-0',
      'grid',
      'min-w-0',
      'grid-cols-1',
      'gap-x-[14px]',
      'gap-y-[10px]',
      'text-body-sm',
      'sm:grid-cols-2'
    );
    expect(list?.children).toHaveLength(2);

    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual(
      ['시작', '상태']
    );
    expect(
      screen
        .getAllByRole('definition')
        .map((definition) => definition.textContent)
    ).toEqual(['06:10:00', '성공']);

    const firstItem = list?.firstElementChild;
    expect(firstItem).toHaveClass('min-w-0');
    expect(firstItem?.querySelector('dt')).toHaveClass(
      'm-0',
      'mb-0.5',
      'text-faint'
    );
    expect(firstItem?.querySelector('dd')).toHaveClass(
      'mono',
      'wrap-anywhere',
      'm-0',
      'text-fg'
    );
  });
});
