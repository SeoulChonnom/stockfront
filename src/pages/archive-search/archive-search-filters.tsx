import { useEffect, useMemo, useState } from 'react';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/domain/filter-bar';
import { useFilterDraft } from '@/components/domain/use-filter-draft';
import { useAnnounce } from '@/components/shell/use-announce';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { ThemeNodeResponse } from '@/lib/api/types';
import { isValidIsoDate } from '@/lib/kst-date';
import { cn } from '@/lib/utils';

import { ArchiveThemeSelect } from '@/pages/archive-search/archive-theme-select';
import {
  type ArchiveFilterDraft,
  type ArchiveRangePreset,
  getArchiveRangePresets,
  getDefaultArchiveFilters,
  getMarketOptions,
  getStatusOptions,
  matchArchiveRangePreset,
  validateArchiveFilters,
} from '@/pages/archive-search/filter-copy';

/**
 * `<input type="date">`는 브라우저 로캘로 렌더된다(예: `08/23/2026`) —
 * 이 화면의 다른 모든 날짜(칩, 요약, URL)는 ISO라서 `09/06`처럼 월/일이
 * 헷갈리는 값은 한국어 사용자에게 실제로 모호하다. 아직 입력 중인 값을
 * ISO로 다시 보여줘 그 모호함을 없앤다 — 값이 비었거나 완전한 ISO 날짜가
 * 아니면(입력 중 중간 상태) 힌트를 아예 띄우지 않는다.
 */
function getIsoDateHint(value: string): string | undefined {
  return isValidIsoDate(value) ? value : undefined;
}

/** `aria-describedby`를 에러 id·힌트 id 조합으로 만든다. 두 값 다 없으면 `undefined`. */
function describedBy(
  ...ids: Array<string | undefined | false>
): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined.length > 0 ? joined : undefined;
}

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

/**
 * 결과 표 영역의 칩·월 헤더와 달리, 이 줄은 필터 카드 **안**이라서 클릭해도
 * 바로 검색하지 않는다 — draft의 `from`/`to`만 바꾸고 `필터 적용`을
 * 기다린다. 그래야 다른 필드를 함께 고치는 중에도 커밋 시점이 하나로
 * 유지되고, `FilterDirtyBadge`가 거짓말하지 않는다.
 */
function RangePresetRow({
  activePresetId,
  onSelect,
}: {
  activePresetId: string | null;
  onSelect: (preset: ArchiveRangePreset) => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Biome suggests <fieldset>, but these buttons pick a value directly, not grouped form controls to submit.
    <div aria-label='기간 프리셋' className='flex flex-wrap gap-2' role='group'>
      {getArchiveRangePresets().map((preset) => (
        <Button
          aria-pressed={preset.id === activePresetId}
          className={cn(
            'tap-control tnum',
            preset.id === activePresetId &&
              'border-primary-line bg-primary-soft text-primary'
          )}
          key={preset.id}
          onClick={() => onSelect(preset)}
          size='sm'
          type='button'
          variant='secondary'
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
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
    setFields,
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

  const activePresetId = matchArchiveRangePreset({
    from: draft.from,
    to: draft.to,
  });

  function handlePresetSelect(preset: ArchiveRangePreset) {
    setFields({ from: preset.from, to: preset.to });
    announce(
      `기간을 ${preset.label}로 바꿨습니다. 필터 적용을 눌러 검색하세요.`
    );
  }

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

  return (
    <section aria-labelledby='archive-filter-heading'>
      {/* Use 16px vertical and 18px horizontal card padding at all widths. */}
      <Card className='flex flex-col gap-2.5 px-[18px] py-4'>
        {/* 적용 필터 요약은 이제 결과 카드 위의 칩 한 줄이 유일한 출처다 —
            여기는 "필터"라는 제목과 미적용 변경 배지만 남긴다. */}
        <div className='flex flex-wrap items-center gap-2.5'>
          <h2
            className='m-0 text-label font-semibold tracking-caps text-fg-soft uppercase'
            id='archive-filter-heading'
          >
            필터
          </h2>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar
          beforeFields={
            <RangePresetRow
              activePresetId={activePresetId}
              onSelect={handlePresetSelect}
            />
          }
          className='gap-3 [&_label]:mb-[5px]'
          onReset={reset}
          onSubmit={handleSubmit}
        >
          {/* No native `max`/`min` here on purpose: an HTML5
              constraint-violating value makes the browser (and jsdom)
              silently block the form's `submit` event before it ever
              reaches `handleSubmit`. */}
          <FilterField
            error={errors.from}
            hint={getIsoDateHint(draft.from)}
            htmlFor='from'
            label='시작일'
          >
            <Input
              className={cn(
                'tap-control tnum rounded-md bg-card px-3 py-0 text-body',
                !errors.from && 'border-line-strong'
              )}
              type='date'
              {...getFieldProps('from')}
              aria-describedby={describedBy(
                errors.from && 'from-error',
                getIsoDateHint(draft.from) && 'from-hint'
              )}
            />
          </FilterField>
          <FilterField
            error={errors.to}
            hint={getIsoDateHint(draft.to)}
            htmlFor='to'
            label='종료일'
          >
            <Input
              className={cn(
                'tap-control tnum rounded-md bg-card px-3 py-0 text-body',
                !errors.to && 'border-line-strong'
              )}
              type='date'
              {...getFieldProps('to')}
              aria-describedby={describedBy(
                errors.to && 'to-error',
                getIsoDateHint(draft.to) && 'to-hint'
              )}
            />
          </FilterField>
          <FilterField htmlFor='status' label='생성 상태'>
            <NativeSelect
              className='min-h-tap border-line-strong bg-card text-body text-fg'
              {...getFieldProps('status')}
            >
              {getStatusOptions().map((option) => (
                <NativeSelectOption
                  key={option.value || 'all'}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField htmlFor='market' label='시장'>
            <NativeSelect
              className='min-h-tap border-line-strong bg-card text-body text-fg'
              {...getFieldProps('market')}
            >
              {getMarketOptions().map((option) => (
                <NativeSelectOption
                  key={option.value || 'all'}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField
            error={errors.q}
            hint='2자 이상'
            htmlFor='q'
            label='키워드'
          >
            <Input
              className={cn(
                'tap-control rounded-md bg-card px-3 py-0 text-body',
                !errors.q && 'border-line-strong'
              )}
              placeholder='예: 반도체, 금리'
              type='search'
              {...getFieldProps('q')}
              aria-describedby={describedBy(errors.q && 'q-error', 'q-hint')}
            />
          </FilterField>
          {/* 테마는 이제 트리를 항상 펼치지 않는다 — 팝오버 트리거 하나가
              다른 필드와 같은 그리드 셀을 차지한다. 로딩/에러/빈 카탈로그
              분기와 도움말 문구는 `ArchiveThemeSelect` 팝오버 안으로
              옮겨갔다.

              이 칸만 `FilterField`를 쓰지 않는다. 트리거는 `<input>`이
              아니라 `<button>`이고, `<button>`은 labelable 요소라서
              `<label for>`가 붙는 순간 그 라벨이 버튼의 접근 이름을
              **덮어쓴다**. 그러면 눈으로는 "테마 3개 선택"을 보는데
              스크린 리더는 "테마"만 읽어 현재 선택이 사라진다. 그래서
              시각 라벨은 정렬을 위해 남기되 `aria-hidden`으로 접근성
              트리에서 빼고, 이름은 버튼 자신의 문구가 갖게 한다. */}
          <div className='min-w-0'>
            <span
              aria-hidden='true'
              className='mb-[5px] block text-label font-semibold text-fg-soft'
            >
              테마
            </span>
            <ArchiveThemeSelect
              catalog={catalog}
              error={themeCatalogError}
              isLoading={themeCatalogLoading}
              onChange={setSelectedThemes}
              onRetry={onRetryThemeCatalog}
              selectedCodes={selectedThemes}
              triggerId='archive-theme-trigger'
            />
          </div>
        </FilterBar>
      </Card>
    </section>
  );
}
