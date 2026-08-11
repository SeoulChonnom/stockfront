import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders a 5-number window centred on the current page', () => {
    render(<Pagination onPageChange={vi.fn()} page={5} totalPages={10} />);

    for (const n of [3, 4, 5, 6, 7]) {
      expect(
        screen.getByRole('button', { name: String(n) })
      ).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '8' })).not.toBeInTheDocument();
  });

  it('marks the current page with aria-current="page" and no others', () => {
    render(<Pagination onPageChange={vi.fn()} page={5} totalPages={10} />);

    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: '4' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('gives the current page a soft-accent fill so it is also visible to sighted users (aria-current alone is invisible)', () => {
    render(<Pagination onPageChange={vi.fn()} page={5} totalPages={10} />);

    const current = screen.getByRole('button', { name: '5' });
    expect(current.className).toContain('bg-[color:var(--primary-soft)]');
    expect(current.className).toContain('text-[color:var(--primary)]');
    expect(current.className).toContain('border-[color:var(--primary-line)]');

    const other = screen.getByRole('button', { name: '4' });
    expect(other.className).not.toContain('bg-[color:var(--primary-soft)]');
  });

  it('disables 이전 on the first page and 다음 on the last page', () => {
    const { rerender } = render(
      <Pagination onPageChange={vi.fn()} page={1} totalPages={3} />
    );
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).not.toBeDisabled();

    rerender(<Pagination onPageChange={vi.fn()} page={3} totalPages={3} />);
    expect(screen.getByRole('button', { name: '이전' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });

  it("renders only the mono page indicator because count ranges live in each list panel's heading", () => {
    render(<Pagination onPageChange={vi.fn()} page={2} totalPages={3} />);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.queryByText(/\d+–\d+ \/ \d+/)).not.toBeInTheDocument();
  });

  it('calls onAnnounce with "N페이지를 불러옵니다." and onPageChange when a page button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onAnnounce = vi.fn();

    render(
      <Pagination
        onAnnounce={onAnnounce}
        onPageChange={onPageChange}
        page={1}
        totalPages={3}
      />
    );

    await user.click(screen.getByRole('button', { name: '2' }));

    expect(onAnnounce).toHaveBeenCalledWith('2페이지를 불러옵니다.');
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('does not call onPageChange when the disabled 이전 button is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination onPageChange={onPageChange} page={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: '이전' }));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('renders a nav with an aria-label and does not render its own live region', () => {
    render(<Pagination onPageChange={vi.fn()} page={1} totalPages={3} />);

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
    expect(document.querySelector('[aria-live]')).not.toBeInTheDocument();
  });

  it('uses the reference target size and subdued page indicator typography', () => {
    render(<Pagination onPageChange={vi.fn()} page={2} totalPages={3} />);

    expect(screen.getByRole('button', { name: '이전' }).className).toContain(
      'min-w-11'
    );
    expect(screen.getByRole('button', { name: '이전' }).className).toContain(
      'min-h-10'
    );
    expect(screen.getByText('2 / 3').className).toContain('text-[12px]');
    expect(screen.getByText('2 / 3').className).toContain('text-faint');
  });
});
