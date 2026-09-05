import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import type { ThemeNodeResponse } from '@/lib/api/types';
import { getTodayIso } from '@/lib/kst-date';

import { ArchiveSearchFilters } from '@/pages/archive-search/archive-search-filters';
import type { ArchiveFilterDraft } from '@/pages/archive-search/filter-copy';

function renderWithAnnounce(ui: ReactNode) {
  return render(<AnnounceProvider pathname='/test'>{ui}</AnnounceProvider>);
}

function getLiveRegionText() {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

// `userEvent.type` simulates keystrokes, which native `<input type="date">`
// elements don't reliably accept in jsdom (well-documented Testing Library
// limitation for picker-style input types) — `fireEvent.change` sets
// `.value` directly and fires the same `change` event React's controlled
// `onChange` relies on, so every date-field edit below goes through this
// instead of `user.type`.
function setDateValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

const catalog = [
  {
    code: 'SECTOR',
    label: '업종',
    description: '기업의 주요 사업 영역',
    children: [
      {
        code: 'SECTOR_SEMICONDUCTORS',
        label: '반도체',
        description: '반도체 산업',
        children: [],
      },
    ],
  },
] satisfies ThemeNodeResponse[];

const applied = {
  from: '2026-07-13',
  to: '2026-07-27',
  status: '',
  market: '',
  themes: [],
  q: '',
} satisfies ArchiveFilterDraft;

function renderFilters(
  overrides: Partial<ComponentProps<typeof ArchiveSearchFilters>> = {}
) {
  return renderWithAnnounce(
    <ArchiveSearchFilters
      applied={applied}
      onApply={vi.fn()}
      onReset={vi.fn()}
      themeCatalog={catalog}
      {...overrides}
    />
  );
}

describe('ArchiveSearchFilters', () => {
  it('does not call onApply while typing — draft/applied stay separate until submit', () => {
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-01');

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(/적용 전 변경 있음/)).toBeInTheDocument();
  });

  it('calls onApply with the draft values when 필터 적용 is submitted with valid input', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-10');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).toHaveBeenCalledWith({ ...applied, from: '2026-07-10' });
    expect(screen.getByLabelText('시작일')).not.toHaveAttribute('aria-invalid');
  });

  it('rejects a future date with the exact product message, blocks apply, and focuses the field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    const today = getTodayIso();
    const toInput = screen.getByLabelText('종료일');
    setDateValue(toInput, '2099-01-01');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(toInput).toHaveAttribute('aria-invalid', 'true');
    expect(toInput).toHaveFocus();
    expect(
      screen.getByText(
        `미래 날짜는 선택할 수 없습니다. 오늘(${today})까지 조회할 수 있습니다.`
      )
    ).toBeInTheDocument();
    expect(getLiveRegionText()).toBe(
      '필터를 적용하지 못했습니다. 입력 오류 1건을 확인해 주세요.'
    );
  });

  it('rejects from > to with the exact swap message, attached to the start date field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-27');
    setDateValue(screen.getByLabelText('종료일'), '2026-07-13');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toHaveFocus();
  });

  it('reset calls onReset and announces the default-restore message', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={onReset}
        themeCatalog={catalog}
      />
    );

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(getLiveRegionText()).toBe('필터를 기본값으로 초기화했습니다.');
  });

  it('offers only the public READY and PARTIAL status options', () => {
    renderFilters();

    const select = screen.getByLabelText('생성 상태');
    const labels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent
    );

    expect(labels).toEqual(['전체 상태', '준비 완료', '부분 생성']);
  });

  it('submits market, q, and independently selected themes in stable selection order', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    await user.selectOptions(screen.getByLabelText('시장'), 'KR');
    await user.type(screen.getByLabelText('키워드'), 'rate');
    await user.click(
      screen.getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
    );
    await user.click(screen.getByRole('checkbox', { name: '업종' }));
    await user.click(screen.getByRole('checkbox', { name: '업종 / 반도체' }));
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).toHaveBeenCalledWith({
      from: '2026-07-13',
      to: '2026-07-27',
      status: '',
      market: 'KR',
      themes: ['SECTOR', 'SECTOR_SEMICONDUCTORS'],
      q: 'rate',
    });
  });

  /*
   * 트리거는 `<button>`이고 `<button>`은 labelable 요소다. 그래서 옆에
   * `<label for>`를 붙이면 그 라벨이 버튼 자신의 문구를 덮어써서, 눈으로는
   * "테마 2개 선택"을 보는데 스크린 리더는 "테마"만 읽게 된다. 시각 라벨을
   * `aria-hidden`으로 뺀 이유가 이것이고, 이 테스트가 그 선택을 고정한다.
   */
  it('keeps the selection count in the theme trigger accessible name', async () => {
    const user = userEvent.setup();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={vi.fn()}
        themeCatalog={catalog}
      />
    );

    expect(
      screen.getByRole('button', { name: '테마 전체' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '테마 전체' }));
    await user.click(screen.getByRole('checkbox', { name: '업종' }));

    expect(
      screen.getByRole('button', { name: '테마 1개 선택' })
    ).toBeInTheDocument();
  });

  it('shows explicit loading, empty, and error states for the catalog inside the theme popover', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={vi.fn()}
        themeCatalog={undefined}
        themeCatalogLoading
      />
    );
    await user.click(
      screen.getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '테마 목록을 불러오는 중입니다.'
    );

    rerender(
      <AnnounceProvider pathname='/test'>
        <ArchiveSearchFilters
          applied={applied}
          onApply={vi.fn()}
          onReset={vi.fn()}
          themeCatalog={[]}
        />
      </AnnounceProvider>
    );
    expect(
      screen.getByText('선택할 수 있는 테마가 없습니다.')
    ).toBeInTheDocument();

    const retry = vi.fn();
    rerender(
      <AnnounceProvider pathname='/test'>
        <ArchiveSearchFilters
          applied={applied}
          onApply={vi.fn()}
          onReset={vi.fn()}
          themeCatalog={undefined}
          themeCatalogError={new Error('catalog down')}
          onRetryThemeCatalog={retry}
        />
      </AnnounceProvider>
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '테마 목록을 불러오지 못했습니다.'
    );
    await user.click(screen.getByRole('button', { name: '테마 다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  /*
   * `<input type="date">`는 브라우저 로캘로 렌더돼(`08/23/2026` 등) 이 화면의
   * 다른 모든 날짜(칩, 요약, URL)가 쓰는 ISO와 다르다. 힌트가 편집 중에도
   * 실제로 적용될 ISO 값을 보여주는지, 그리고 스크린 리더가 그 힌트를
   * 필드의 설명으로 실제로 읽는지(문자열 일치가 아니라 DOM 연결) 확인한다.
   */
  it("shows each date field's current draft value in ISO as a hint, wired via aria-describedby", () => {
    renderFilters();

    const fromInput = screen.getByLabelText('시작일');
    const fromDescribedBy = fromInput.getAttribute('aria-describedby');
    expect(fromDescribedBy).toBe('from-hint');
    expect(
      document.getElementById(fromDescribedBy as string)
    ).toHaveTextContent('2026-07-13');

    const toInput = screen.getByLabelText('종료일');
    const toDescribedBy = toInput.getAttribute('aria-describedby');
    expect(toDescribedBy).toBe('to-hint');
    expect(document.getElementById(toDescribedBy as string)).toHaveTextContent(
      '2026-07-27'
    );
  });

  it('names both the error and the hint in aria-describedby when a date field has an error', async () => {
    const user = userEvent.setup();
    renderFilters();

    setDateValue(screen.getByLabelText('시작일'), '2026-07-27');
    setDateValue(screen.getByLabelText('종료일'), '2026-07-13');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    const fromInput = screen.getByLabelText('시작일');
    expect(fromInput).toHaveAttribute(
      'aria-describedby',
      'from-error from-hint'
    );
    expect(document.getElementById('from-error')).toHaveTextContent(
      '시작일이 종료일보다 늦습니다.'
    );
    expect(document.getElementById('from-hint')).toHaveTextContent(
      '2026-07-27'
    );
  });

  it('shows the 2자 이상 length hint on the keyword field before any submission', () => {
    renderFilters();

    const keywordInput = screen.getByLabelText('키워드');
    expect(keywordInput).toHaveAttribute('aria-describedby', 'q-hint');
    expect(screen.getByText('2자 이상')).toBeInTheDocument();
  });
});
