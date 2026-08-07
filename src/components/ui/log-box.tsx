import type { ReactNode } from 'react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

/** Log output wraps long tokens, and copy falls back when Clipboard API is unavailable. */

const PREVIEW_LENGTH = 600;
const COPIED_LABEL_DURATION_MS = 2000;

function fallbackCopy(text: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);
  return succeeded;
}

export type LogBoxProps = {
  content: string;
  className?: string;
  heading?: ReactNode;
};

export function LogBox({ content, className, heading }: LogBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isTruncatable = content.length > PREVIEW_LENGTH;
  const displayed =
    expanded || !isTruncatable
      ? content
      : `${content.slice(0, PREVIEW_LENGTH)}…`;
  const charCount = content.length.toLocaleString('ko-KR');

  async function handleCopy() {
    let succeeded = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        succeeded = true;
      } else {
        succeeded = fallbackCopy(content);
      }
    } catch {
      succeeded = fallbackCopy(content);
    }

    if (succeeded) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_LABEL_DURATION_MS);
    }
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className='mb-2 flex flex-wrap items-center gap-2'>
        {heading}
        <Button
          onClick={() => {
            void handleCopy();
          }}
          size='sm'
          type='button'
          variant='ghost'
        >
          {copied ? '복사했습니다' : '복사'}
        </Button>
        {isTruncatable ? (
          <Button
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            size='sm'
            type='button'
            variant='ghost'
          >
            {expanded ? '요약만 보기' : `전체 ${charCount}자 보기`}
          </Button>
        ) : null}
      </div>
      <pre className='mono m-0 max-h-[240px] overflow-auto rounded-[var(--r-md)] border border-line bg-[color:var(--surface-2)] p-3 text-caption break-words whitespace-pre-wrap [overflow-wrap:anywhere]'>
        {displayed}
      </pre>
    </div>
  );
}
