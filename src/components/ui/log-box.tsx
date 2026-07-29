import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

/**
 * LogBox — README §7-6 실행 로그. `<pre>`는 `max-height:240px; overflow:auto;
 * white-space:pre-wrap; overflow-wrap:anywhere` + `--surface-2` 배경 +
 * mono 11.5px — 4,000자짜리 로그에 공백 없는 긴 토큰이 섞여 있어도 문서
 * 가로 스크롤을 만들지 않는다(`overflow-wrap:anywhere` + `break-words`
 * 이중 안전장치).
 *
 * `복사` 버튼은 `navigator.clipboard`를 쓰고 없으면 숨겨진 textarea +
 * `execCommand('copy')`로 폴백한다. 확인 문구("복사했습니다")는 버튼
 * 라벨을 잠깐 바꾸는 방식이라 화면의 단일 `aria-live` region을 가로채지
 * 않는다(§15). `전체 N,NNN자 보기` 토글은 `aria-expanded`를 갖는다.
 */

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
};

export function LogBox({ content, className }: LogBoxProps) {
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
      <div className='mb-2 flex flex-wrap gap-2'>
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
      <pre className='mono m-0 max-h-[240px] overflow-auto rounded-[var(--r-md)] border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3 text-[11.5px] break-words whitespace-pre-wrap [overflow-wrap:anywhere]'>
        {displayed}
      </pre>
    </div>
  );
}
