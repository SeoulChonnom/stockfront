import { useEffect, useMemo, useState } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import { InlineAlert } from '@/components/state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { useFilterDraft } from '@/components/ui/use-filter-draft';
import type { ThemeNodeResponse } from '@/lib/api/types';
import { cn } from '@/lib/utils';

import { ArchiveThemeTree } from './archive-theme-tree';
import {
  type ArchiveFilterDraft,
  getDefaultArchiveFilters,
  getStatusOptions,
  getStatusSummaryLabel,
  validateArchiveFilters,
} from './filter-copy';

type ArchiveTextFilterDraft = Omit<ArchiveFilterDraft, 'themes'>;

type ArchiveSearchFiltersProps = {
  applied: ArchiveFilterDraft;
  onApply: (next: ArchiveFilterDraft) => void;
  onReset: () => void;
  themeCatalog?: readonly ThemeNodeResponse[];
  themeCatalogLoading?: boolean;
  themeCatalogError?: Error | null;
  onRetryThemeCatalog?: () => void;
};

function toTextDraft(filters: ArchiveFilterDraft): ArchiveTextFilterDraft {
  return {
    from: filters.from,
    to: filters.to,
    status: filters.status,
    market: filters.market,
    q: filters.q,
  };
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function findThemeLabel(
  nodes: readonly ThemeNodeResponse[],
  code: string
): string | null {
  for (const node of nodes) {
    if (node.code === code) {
      return node.label;
    }

    const childLabel = findThemeLabel(node.children, code);
    if (childLabel) {
      return childLabel;
    }
  }

  return null;
}

export function ArchiveSearchFilters({
  applied,
  onApply,
  onReset,
  themeCatalog,
  themeCatalogLoading = false,
  themeCatalogError = null,
  onRetryThemeCatalog,
}: ArchiveSearchFiltersProps) {
  const announce = useAnnounce();
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    applied.themes
  );
  const defaultValues = useMemo(() => {
    const defaults = getDefaultArchiveFilters();
    return toTextDraft(defaults);
  }, []);
  const {
    draft,
    errors,
    isDirty: textIsDirty,
    apply,
    reset,
    getFieldProps,
  } = useFilterDraft<ArchiveTextFilterDraft>({
    applied: toTextDraft(applied),
    defaultValues,
    validate: (next) =>
      validateArchiveFilters({ ...next, themes: selectedThemes }),
    onApply: (next) => onApply({ ...next, themes: [...selectedThemes] }),
    onReset: () => {
      setSelectedThemes([]);
      onReset();
      announce('필터를 기본값으로 초기화했습니다.');
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: resync from the serialized URL selection, not array identity.
  useEffect(() => {
    setSelectedThemes(applied.themes);
  }, [JSON.stringify(applied.themes)]);

  const themesAreDirty = !sameValues(selectedThemes, applied.themes);
  const isDirty = textIsDirty || themesAreDirty;
  const catalog = themeCatalog ?? [];

  function handleSubmit() {
    const validationErrors = validateArchiveFilters({
      ...draft,
      themes: selectedThemes,
    });
    const succeeded = apply();

    if (!succeeded) {
      const count = Object.keys(validationErrors).length;
      announce(
        `필터를 적용하지 못했습니다. 입력 오류 ${count}건을 확인해 주세요.`
      );
    }
  }

  function getAppliedThemeSummary() {
    if (applied.themes.length === 0) {
      return '테마 전체';
    }

    return `테마 ${applied.themes
      .map((code) => findThemeLabel(catalog, code) ?? code)
      .join(', ')}`;
  }

  return (
    <section aria-labelledby='archive-filter-heading'>
      {/* Use 16px vertical and 18px horizontal card padding at all widths. */}
      <Card className='flex flex-col gap-3' padding='inset'>
        {/* Keep the heading and applied summary in one wrapping row. */}
        <div className='flex flex-wrap items-center gap-2.5'>
          <h2
            className='m-0 text-label font-semibold tracking-caps text-fg-soft uppercase'
            id='archive-filter-heading'
          >
            필터
          </h2>
          <span className='tnum wrap-anywhere text-body-sm text-faint'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getStatusSummaryLabel(applied.status)}
          </span>
          {applied.market || applied.themes.length > 0 || applied.q ? (
            <span className='tnum wrap-anywhere text-body-sm text-faint'>
              {applied.market ? `시장 ${applied.market}` : '시장 전체'} ·{' '}
              {getAppliedThemeSummary()}
              {applied.q ? ` · 검색어 ${applied.q}` : ''}
            </span>
          ) : null}
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar className='gap-3.5' onReset={reset} onSubmit={handleSubmit}>
          {/* No native `max`/`min` here on purpose: an HTML5
              constraint-violating value makes the browser (and jsdom)
              silently block the form's `submit` event before it ever
              reaches `handleSubmit`. */}
          <FilterField error={errors.from} htmlFor='from' label='시작일'>
            <Input
              className={cn(
                'tnum rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-body',
                !errors.from && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.from)}
              type='date'
              {...getFieldProps('from')}
            />
          </FilterField>
          <FilterField error={errors.to} htmlFor='to' label='종료일'>
            <Input
              className={cn(
                'tnum rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-body',
                !errors.to && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.to)}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='생성 상태'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-body text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('status')}
            >
              {getStatusOptions().map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField htmlFor='market' label='시장'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-body text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('market')}
            >
              <option value=''>전체 시장</option>
              <option value='KR'>한국 (KR)</option>
              <option value='US'>미국 (US)</option>
            </select>
          </FilterField>
          <FilterField error={errors.q} htmlFor='q' label='키워드'>
            <Input
              className={cn(
                'rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-body',
                !errors.q && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.q)}
              placeholder='정확한 단어를 입력해 주세요'
              type='search'
              {...getFieldProps('q')}
            />
          </FilterField>
          {/* 테마도 다른 필드와 같은 문법을 쓴다: 라벨이 위에 서고, 그 아래
              컨트롤이 `--line-strong` 테두리를 두른다. 예전에는 이 필드만
              `<legend>`이 테두리에 파여 들어간 fieldset 박스여서, 같은 폼
              안에서 혼자 다른 종족처럼 보였다. `<fieldset>`/`<legend>` 자체는
              체크박스 묶음의 접근성 그룹이라 유지하고, 테두리만 옮긴다. */}
          <fieldset className='min-w-0 min-[1181px]:col-span-3'>
            <legend className='mb-1 block text-label font-semibold text-fg-soft'>
              테마
            </legend>
            <p
              className='measure-error m-0 mb-2 text-body-sm text-faint'
              id='archive-theme-help'
            >
              부모와 자식 테마를 각각 선택할 수 있습니다. 선택한 테마는 최대
              10개이며, 선택한 부모의 하위 테마를 URL에 자동으로 추가하지
              않습니다.
            </p>
            {themeCatalogLoading ? (
              <div
                className='rounded-[var(--r-md)] bg-[color:var(--surface-2)] px-3 py-3 text-body-sm text-faint'
                role='status'
              >
                테마 목록을 불러오는 중입니다.
              </div>
            ) : themeCatalogError ? (
              <InlineAlert
                actions={
                  <Button
                    onClick={onRetryThemeCatalog}
                    size='sm'
                    type='button'
                    variant='secondary'
                  >
                    테마 다시 시도
                  </Button>
                }
                className='bg-[color:var(--surface)]'
                ariaLive='polite'
                role='status'
                title='테마 목록을 불러오지 못했습니다.'
                tone='danger'
              >
                잠시 후 다시 시도해 주세요. 테마를 선택하지 않은 검색은 계속
                사용할 수 있습니다.
              </InlineAlert>
            ) : catalog.length === 0 ? (
              <p className='m-0 rounded-[var(--r-md)] bg-[color:var(--surface-2)] px-3 py-3 text-body-sm text-faint'>
                선택할 수 있는 테마가 없습니다.
              </p>
            ) : (
              <div className='rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-3 py-2.5'>
                <ArchiveThemeTree
                  nodes={catalog}
                  onChange={setSelectedThemes}
                  selectedCodes={selectedThemes}
                />
              </div>
            )}
          </fieldset>
        </FilterBar>
      </Card>
    </section>
  );
}
