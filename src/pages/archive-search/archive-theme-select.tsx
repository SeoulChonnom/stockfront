import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

import { InlineAlert } from '@/components/state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ThemeNodeResponse } from '@/lib/api/types';
import { formatInteger } from '@/lib/formatters';

import { ArchiveThemeTree } from '@/pages/archive-search/archive-theme-tree';

const DEFAULT_TRIGGER_ID = 'archive-theme-trigger';

const THEME_HELP_TEXT =
  '부모와 자식 테마를 각각 선택할 수 있습니다. 선택한 테마는 최대 10개이며, 선택한 부모의 하위 테마를 URL에 자동으로 추가하지 않습니다.';

export type ArchiveThemeSelectProps = {
  catalog: readonly ThemeNodeResponse[];
  selectedCodes: readonly string[];
  onChange: (codes: string[]) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  triggerId?: string;
};

function getTriggerLabel(count: number): string {
  return count > 0 ? `테마 ${formatInteger(count)}개 선택` : '테마 전체';
}

function ThemeSelectError({ onRetry }: { onRetry?: () => void }) {
  return (
    <InlineAlert
      actions={
        <Button onClick={onRetry} size='sm' type='button' variant='secondary'>
          테마 다시 시도
        </Button>
      }
      ariaLive='polite'
      className='m-3 bg-card'
      role='status'
      title='테마 목록을 불러오지 못했습니다.'
      tone='danger'
    >
      잠시 후 다시 시도해 주세요. 테마를 선택하지 않은 검색은 계속 사용할 수
      있습니다.
    </InlineAlert>
  );
}

function ThemeSelectPicker({
  catalog,
  selectedCodes,
  onChange,
  query,
  onQueryChange,
}: Pick<ArchiveThemeSelectProps, 'catalog' | 'selectedCodes' | 'onChange'> & {
  query: string;
  onQueryChange: (next: string) => void;
}) {
  return (
    <>
      <div className='px-3 py-2'>
        <Input
          aria-label='테마 이름으로 좁히기'
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            // 팝오버 안에서 Enter가 폼 제출 등 의도치 않은 동작으로 새지 않게 막는다.
            if (event.key === 'Enter') {
              event.preventDefault();
            }
          }}
          placeholder='테마 이름으로 좁히기'
          type='search'
          value={query}
        />
      </div>
      <div className='max-h-[300px] overflow-y-auto px-3 py-2'>
        <ArchiveThemeTree
          nodes={catalog}
          onChange={onChange}
          query={query}
          selectedCodes={selectedCodes}
        />
      </div>
      {selectedCodes.length > 0 ? (
        <div className='flex items-center justify-between border-t border-line px-3 py-2'>
          <span className='text-body-sm text-faint'>
            {formatInteger(selectedCodes.length)}개 선택됨
          </span>
          <Button
            onClick={() => onChange([])}
            size='sm'
            type='button'
            variant='secondary'
          >
            선택 해제
          </Button>
        </div>
      ) : null}
    </>
  );
}

function ArchiveThemeSelectBody({
  catalog,
  selectedCodes,
  onChange,
  isLoading,
  error,
  onRetry,
  query,
  onQueryChange,
}: ArchiveThemeSelectProps & {
  query: string;
  onQueryChange: (next: string) => void;
}) {
  if (isLoading) {
    return (
      <div className='px-3 py-3 text-body-sm text-faint' role='status'>
        테마 목록을 불러오는 중입니다.
      </div>
    );
  }

  if (error) {
    return <ThemeSelectError onRetry={onRetry} />;
  }

  if (catalog.length === 0) {
    return (
      <p className='m-0 px-3 py-3 text-body-sm text-faint'>
        선택할 수 있는 테마가 없습니다.
      </p>
    );
  }

  return (
    <ThemeSelectPicker
      catalog={catalog}
      onChange={onChange}
      onQueryChange={onQueryChange}
      query={query}
      selectedCodes={selectedCodes}
    />
  );
}

export function ArchiveThemeSelect({
  catalog,
  selectedCodes,
  onChange,
  isLoading = false,
  error = null,
  onRetry,
  triggerId = DEFAULT_TRIGGER_ID,
}: ArchiveThemeSelectProps) {
  const [query, setQuery] = useState('');

  return (
    <Popover
      onOpenChange={(open) => {
        // 다음에 열었을 때 이전 검색어가 남아 결과를 미리 좁혀 두지 않도록 초기화한다.
        if (!open) {
          setQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          className='min-h-tap w-full justify-between border border-line-strong bg-card px-3 text-body font-normal text-fg'
          id={triggerId}
          type='button'
          variant='secondary'
        >
          {getTriggerLabel(selectedCodes.length)}
          <ChevronDownIcon className='size-4 shrink-0 text-faint' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        aria-label='테마 선택'
        className='w-[320px] max-w-[calc(100vw-2rem)] p-0'
      >
        <div className='border-b border-line px-3 py-2.5'>
          <p className='m-0 text-body-sm text-faint'>{THEME_HELP_TEXT}</p>
        </div>
        <ArchiveThemeSelectBody
          catalog={catalog}
          error={error}
          isLoading={isLoading}
          onChange={onChange}
          onQueryChange={setQuery}
          onRetry={onRetry}
          query={query}
          selectedCodes={selectedCodes}
        />
      </PopoverContent>
    </Popover>
  );
}
