import { useEffect, useId, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import type { ThemeNodeResponse } from '@/lib/api/types';
import { filterThemeNodes } from '@/pages/archive-search/theme-node-filter';

const MAX_ARCHIVE_THEME_SELECTIONS = 10;

const THEME_LIMIT_MESSAGE =
  '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.';

const NO_MATCH_MESSAGE = '일치하는 테마가 없습니다.';

type ArchiveThemeTreeProps = {
  nodes: readonly ThemeNodeResponse[];
  selectedCodes: readonly string[];
  onChange: (selectedCodes: string[]) => void;
  maxSelections?: number;
  query?: string;
};

function getInputId(code: string, fallback: string) {
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `archive-theme-${safeCode || fallback}`;
}

function toggleCode(
  selectedCodes: readonly string[],
  code: string,
  maxSelections: number
): { next: string[]; blocked: boolean } {
  if (selectedCodes.includes(code)) {
    return {
      next: selectedCodes.filter((selectedCode) => selectedCode !== code),
      blocked: false,
    };
  }

  if (selectedCodes.length >= maxSelections) {
    return { next: [...selectedCodes], blocked: true };
  }

  return { next: [...selectedCodes, code], blocked: false };
}

function ThemeNode({
  node,
  path,
  selectedCodes,
  onToggle,
}: {
  node: ThemeNodeResponse;
  path: readonly string[];
  selectedCodes: readonly string[];
  onToggle: (code: string) => void;
}) {
  const inputId = getInputId(node.code, useId());
  const accessiblePath = [...path, node.label].join(' / ');
  const descriptionId = `${inputId}-description`;

  return (
    <li className='min-w-0'>
      <div className='flex min-w-0 items-start gap-2 py-1'>
        <Checkbox
          aria-describedby={descriptionId}
          aria-label={accessiblePath}
          checked={selectedCodes.includes(node.code)}
          className='tap-check mt-0.5 shrink-0'
          id={inputId}
          onCheckedChange={() => onToggle(node.code)}
        />
        <div className='min-w-0'>
          <label
            className='tap-target justify-start cursor-pointer text-body-sm font-semibold text-fg'
            htmlFor={inputId}
          >
            {node.label}
          </label>
          <p
            className='wrap-anywhere m-0 text-body-sm text-faint'
            id={descriptionId}
          >
            {node.description}
          </p>
        </div>
      </div>
      {node.children.length > 0 ? (
        <ul
          aria-label={`${accessiblePath} 하위 테마`}
          className='mt-0 ml-4 border-l border-line pl-3'
        >
          {node.children.map((child) => (
            <ThemeNode
              key={child.code}
              node={child}
              onToggle={onToggle}
              path={[...path, node.label]}
              selectedCodes={selectedCodes}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ArchiveThemeTree({
  nodes,
  selectedCodes,
  onChange,
  maxSelections = MAX_ARCHIVE_THEME_SELECTIONS,
  query,
}: ArchiveThemeTreeProps) {
  const [limitReached, setLimitReached] = useState(false);
  const trimmedQuery = query?.trim() ?? '';
  const visibleNodes = trimmedQuery
    ? filterThemeNodes(nodes, trimmedQuery, selectedCodes)
    : nodes;
  const showNoMatch = trimmedQuery.length > 0 && visibleNodes.length === 0;

  useEffect(() => {
    if (selectedCodes.length < maxSelections) {
      setLimitReached(false);
    }
  }, [maxSelections, selectedCodes.length]);

  function handleToggle(code: string) {
    const result = toggleCode(selectedCodes, code, maxSelections);
    if (result.blocked) {
      setLimitReached(true);
      return;
    }

    onChange(result.next);
  }

  return (
    <div className='min-w-0'>
      {showNoMatch ? (
        <p className='m-0 px-1 py-3 text-body-sm text-faint' role='status'>
          {NO_MATCH_MESSAGE}
        </p>
      ) : (
        <ul aria-label='테마 목록' className='m-0 list-none space-y-1 p-0'>
          {visibleNodes.map((node) => (
            <ThemeNode
              key={node.code}
              node={node}
              onToggle={handleToggle}
              path={[]}
              selectedCodes={selectedCodes}
            />
          ))}
        </ul>
      )}
      {limitReached ? (
        <p
          aria-live='polite'
          className='wrap-anywhere m-0 mt-2 text-body-sm font-semibold text-warning'
          role='status'
        >
          {THEME_LIMIT_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}
