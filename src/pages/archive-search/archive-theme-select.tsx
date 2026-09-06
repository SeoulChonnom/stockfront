import { ChevronDownIcon } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useIsWide } from '@/components/domain/use-is-wide';
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
import {
  MAX_ARCHIVE_THEME_SELECTIONS,
  THEME_LIMIT_MESSAGE,
} from '@/pages/archive-search/theme-limit';

const DEFAULT_TRIGGER_ID = 'archive-theme-trigger';

// "URL에 자동으로 추가하지 않습니다"는 URL 직렬화라는 구현 얘기였다 — 그
// 아래에 있는 실제로 쓸모 있는 사실(부모를 골라도 자식이 함께 선택되지
// 않는다는 동작)만 남기고 내부 표현은 뺀다.
const THEME_HELP_TEXT =
  '상위 테마를 선택해도 하위 테마는 함께 선택되지 않습니다. 최대 10개까지 고를 수 있습니다.';

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
  // 트리(`ArchiveThemeTree`) 자신은 더 이상 이 상태를 갖지 않는다 — 트리는
  // `max-h-[300px] overflow-y-auto` 스크롤 컨테이너 안에 있어서, 50개가
  // 넘는 카탈로그를 스크롤하다 상한에 걸린 사용자에게는 그 안의 메시지가
  // 화면 밖일 수 있다. 이 푸터는 스크롤 컨테이너 밖이라 항상 보인다.
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (selectedCodes.length < MAX_ARCHIVE_THEME_SELECTIONS) {
      setLimitReached(false);
    }
  }, [selectedCodes.length]);

  return (
    <>
      <div className='shrink-0 px-3 py-2'>
        <Input
          aria-label='테마 이름으로 좁히기'
          className='tap-control'
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
      <div className='max-h-[300px] min-h-0 flex-1 overflow-y-auto px-3 py-2'>
        <ArchiveThemeTree
          nodes={catalog}
          onChange={onChange}
          onLimitBlocked={() => setLimitReached(true)}
          query={query}
          selectedCodes={selectedCodes}
        />
      </div>
      {selectedCodes.length > 0 ? (
        <div className='flex shrink-0 flex-col gap-2 border-t border-line px-3 py-2'>
          <div className='flex items-center justify-between'>
            <span className='text-body-sm text-faint'>
              {formatInteger(selectedCodes.length)}개 선택됨
            </span>
            <Button
              className='tap-control'
              onClick={() => onChange([])}
              size='sm'
              type='button'
              variant='secondary'
            >
              선택 해제
            </Button>
          </div>
          {limitReached ? (
            <p
              aria-live='polite'
              className='wrap-anywhere m-0 text-body-sm font-semibold text-warning'
              role='status'
            >
              {THEME_LIMIT_MESSAGE}
            </p>
          ) : null}
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

/**
 * 팝오버(넓은 화면)와 인라인 패널(좁은 화면)이 공유하는 몸통이다 — 도움말
 * 문구부터 스크롤 트리, 상한 경고까지 여기서만 정의해서 두 경로가 서로
 * 갈라지지 않게 한다. `ArchiveThemeSelectBody`의 로딩/에러/빈 카탈로그
 * 분기와 `ThemeSelectPicker`의 스크롤 컨테이너·푸터 배치는 그대로 재사용한다.
 */
function ThemePickerContent(
  props: ArchiveThemeSelectProps & {
    query: string;
    onQueryChange: (next: string) => void;
  }
) {
  return (
    <>
      <div className='shrink-0 border-b border-line px-3 py-2.5'>
        <p className='m-0 text-body-sm text-faint'>{THEME_HELP_TEXT}</p>
      </div>
      <ArchiveThemeSelectBody {...props} />
    </>
  );
}

const TRIGGER_CLASS_NAME =
  'tap-control min-h-tap w-full justify-between border border-line-strong bg-card px-3 text-body font-normal text-fg';

export function ArchiveThemeSelect({
  catalog,
  selectedCodes,
  onChange,
  isLoading = false,
  error = null,
  onRetry,
  triggerId = DEFAULT_TRIGGER_ID,
}: ArchiveThemeSelectProps) {
  const isWide = useIsWide();
  const [query, setQuery] = useState('');
  const [isNarrowOpen, setIsNarrowOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `${triggerId}-panel`;
  const triggerLabel = getTriggerLabel(selectedCodes.length);

  const bodyProps = {
    catalog,
    error,
    isLoading,
    onChange,
    onQueryChange: setQuery,
    onRetry,
    query,
    selectedCodes,
  };

  function closeNarrowPanel() {
    setIsNarrowOpen(false);
    // 팝오버 쪽과 같은 규칙: 다음에 열었을 때 이전 검색어가 결과를 미리
    // 좁혀 두지 않도록 닫힐 때 초기화한다.
    setQuery('');
  }

  function handleNarrowTriggerClick() {
    if (isNarrowOpen) {
      closeNarrowPanel();
      return;
    }

    setIsNarrowOpen(true);
  }

  /*
   * 트리거와 패널을 함께 감싼 래퍼에서 받는다. 패널에만 걸어 두면 열자마자
   * 포커스가 머무는 트리거에서 누른 Esc가 아무 일도 하지 않아, 같은 키가
   * 넓은 화면(Radix 팝오버는 트리거에서도 닫힌다)과 다르게 동작했다.
   */
  function handleDisclosureKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isNarrowOpen || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    closeNarrowPanel();
    triggerRef.current?.focus();
  }

  if (isWide) {
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
            className={TRIGGER_CLASS_NAME}
            id={triggerId}
            type='button'
            variant='secondary'
          >
            {triggerLabel}
            <ChevronDownIcon className='size-4 shrink-0 text-faint' />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          aria-label='테마 선택'
          /* 카탈로그가 50개를 넘으면 팝오버 전체가 뷰포트보다 길어져 푸터의
             상한 경고가 화면 밖으로 잘렸다. Radix가 재는 가용 높이로 상자를
             묶고 안을 flex 컬럼으로 만들어, 넘칠 때 줄어드는 쪽이 트리
             스크롤 영역이 되도록 한다 — 푸터는 항상 화면 안에 남는다. */
          className='flex max-h-(--radix-popover-content-available-height) w-[320px] max-w-[calc(100vw-2rem)] flex-col p-0'
          collisionPadding={16}
        >
          <ThemePickerContent {...bodyProps} />
        </PopoverContent>
      </Popover>
    );
  }

  /*
   * 좁은 화면에는 오버레이가 아예 없다 — 트리거 바로 아래, 폼의 정상 흐름
   * 안에 같은 몸통을 편다. 트리거가 y≈753인 851px 뷰포트에서 Radix가
   * 팝오버를 위로 뒤집어(`data-side="top"`) `to`/`status`/`market`/`q`
   * 필드를 가리는 문제가 있었다 — 겹칠 대상 자체가 없으면 그 문제도 없다.
   */
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Esc는 이 공개 영역 전체(트리거+패널)에서 받아야 하고, 래퍼 자체는 상호작용 대상이 아니라 두 자식의 키 이벤트를 모으는 경계일 뿐이다.
    <div className='min-w-0' onKeyDown={handleDisclosureKeyDown}>
      <Button
        aria-controls={panelId}
        aria-expanded={isNarrowOpen}
        className={TRIGGER_CLASS_NAME}
        id={triggerId}
        onClick={handleNarrowTriggerClick}
        ref={triggerRef}
        type='button'
        variant='secondary'
      >
        {triggerLabel}
        <ChevronDownIcon className='size-4 shrink-0 text-faint' />
      </Button>
      {isNarrowOpen ? (
        // biome-ignore lint/a11y/useSemanticElements: Biome suggests <fieldset>, but this panel isn't a set of form controls submitted together — it's a disclosure region that also needs Escape-to-close, which <fieldset> doesn't model any better than role="group".
        <div
          aria-label='테마 선택'
          className='mt-2 flex max-h-[420px] flex-col rounded-md border border-line bg-card'
          id={panelId}
          role='group'
        >
          <ThemePickerContent {...bodyProps} />
        </div>
      ) : null}
    </div>
  );
}
