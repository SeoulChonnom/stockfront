import type * as React from 'react';

import { cn } from '@/lib/utils';

// shadcn 레지스트리 원본은 여기서 `overflow-x-auto` 컨테이너 div로 감싼다.
// 이 레포는 가로 스크롤 뷰포트와 그 접근성(스크롤 가능할 때만 붙는
// role="region"/tabIndex/aria-label, 엣지 그라데이션)을 전부
// `TableScrollWrapper`(`@/components/domain/table-scroll-wrapper`)가
// 소유한다. 여기서 다시 감싸면 두 겹의 `overflow-x-auto`가 생겨 바깥
// 래퍼는 항상 `scrollWidth === clientWidth`로 측정되고, 그 결과
// 키보드 스크롤 접근성과 엣지 페이드가 영구적으로 죽는다.
// `shadcn add table --overwrite`를 다시 돌리면 이 래퍼가 되살아날 수
// 있으니 주의할 것 — 반드시 맨 `<table>`만 렌더링해야 한다.
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <table
      data-slot='table'
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot='table-header'
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot='table-body'
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot='table-footer'
      className={cn(
        'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
        className
      )}
      {...props}
    />
  );
}

// 선택 상태는 shadcn 기본 `data-[state=selected]:bg-muted`보다 강하게
// 표시해야 한다 — hover가 `bg-muted/50`이라 알파값 차이만으로는 마스터
// -디테일 화면에서 선택 행을 구분하기 어렵다. 배경/좌측 바를
// `--primary-soft`/`--primary`로 올리고, hover가 선택 배경을 씻어내지
// 않도록 hover도 같은 배경으로 고정한다.
// danger 톤(`data-tone="danger"`)의 좌측 바는 선택 행에서는 보이면 안
// 된다(원본 컴포넌트의 `!selected && tone === 'danger'`와 동일한 우선순위).
// `not-data-[state=selected]:` 가드로 이를 명시적으로 강제한다 — 두
// `shadow-*` 유틸의 CSS 등장 순서에 우선순위를 맡기지 않기 위함.
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot='table-row'
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50',
        'data-[state=selected]:bg-primary-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)] data-[state=selected]:hover:bg-primary-soft',
        'not-data-[state=selected]:data-[tone=danger]:shadow-[inset_3px_0_0_var(--danger)]',
        className
      )}
      {...props}
    />
  );
}

// shadcn 기본 `whitespace-nowrap`을 뺐다(변경 전 원본 컴포넌트에도 없던
// 스타일). 이 값이 살아있으면 부모 `<td>`/`<th>`가 자식의
// `wrap-anywhere`/`text-pretty`/`sm:whitespace-nowrap` 같은 줄바꿈 지정을
// `tailwind-merge`로도 지우지 못해 이긴다. nowrap이 실제로 필요한 열은
// 호출부에서 명시적으로 `whitespace-nowrap`을 단다.
function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot='table-head'
      className={cn(
        'h-10 px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot='table-cell'
      className={cn(
        'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot='table-caption'
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
