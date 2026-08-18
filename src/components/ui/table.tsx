import { cva, type VariantProps } from 'class-variance-authority';
import {
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

const tableCellPaddingVariants = cva('', {
  variants: {
    padding: {
      compact: 'py-[9px] px-3',
    },
  },
});

type TableCellPaddingProps = VariantProps<typeof tableCellPaddingVariants>;

/**
 * Tables keep a minimum width inside a scoped horizontal-scroll wrapper —
 * document-level overflow is the thing this app forbids, not scoped table
 * scroll (see `e2e/utils/overflow.ts`).
 *
 * Scoped scroll only works if the reader can tell it is there and can reach
 * it without a mouse, so the wrapper earns two things the bare
 * `overflow-x: auto` div never had:
 *
 *   - `role="region"` + `tabIndex={0}` when it actually scrolls, because a
 *     plain overflow container is not keyboard-reachable in Firefox or
 *     Safari (WCAG 2.1.1). The tab stop is added ONLY while scrollable —
 *     a permanent stop on a table that fits is noise for keyboard users.
 *   - Edge fades that appear on the side there is more content on, so the
 *     clipped `소요`/`시각` column at 390px reads as "keep going" instead of
 *     a truncated number.
 */
export function TableScrollWrapper({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Names the scroll region for screen readers; required once it is focusable. */
  label?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({
    scrollable: false,
    start: false,
    end: false,
  });

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    function measure() {
      const node = viewportRef.current;

      if (!node) {
        return;
      }

      // 1px tolerance: sub-pixel layout rounding otherwise reports a
      // permanently "scrollable" table that has nowhere to scroll.
      const maxScroll = node.scrollWidth - node.clientWidth;
      const scrollable = maxScroll > 1;

      setEdges({
        scrollable,
        start: scrollable && node.scrollLeft > 1,
        end: scrollable && node.scrollLeft < maxScroll - 1,
      });
    }

    measure();

    // Both are needed: the viewport resizes with the layout, and the table
    // inside it resizes when rows load, so observing only one leaves the
    // affordance stale on the other.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    const table = viewport.firstElementChild;

    if (table) {
      observer.observe(table);
    }

    viewport.addEventListener('scroll', measure, { passive: true });

    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', measure);
    };
  }, []);

  // One unit, not three independent attributes: a tab stop with no role is
  // an unexplained stop, and an `aria-label` without a role is dropped
  // entirely. They go on together when the table actually scrolls and come
  // off together when it fits.
  const scrollRegionProps = edges.scrollable
    ? { role: 'region' as const, tabIndex: 0, 'aria-label': label }
    : {};

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        className='w-full overflow-x-auto'
        ref={viewportRef}
        {...scrollRegionProps}
      >
        {children}
      </div>
      <div
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute inset-y-0 start-0 w-7 bg-[linear-gradient(to_right,var(--scroll-edge),transparent)] transition-opacity duration-(--dur-fast)',
          edges.start ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute inset-y-0 end-0 w-7 bg-[linear-gradient(to_left,var(--scroll-edge),transparent)] transition-opacity duration-(--dur-fast)',
          edges.end ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  minWidth?: number | string;
}

export function Table({ className, minWidth, style, ...props }: TableProps) {
  return (
    <table
      className={cn('w-full caption-bottom text-[13px]', className)}
      style={{ ...style, minWidth }}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  tone?: 'danger';
}

export function TableRow({
  className,
  selected,
  tone,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'min-w-0 hover:bg-[color:var(--surface-2)]',
        selected &&
          'bg-[color:var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)] hover:bg-[color:var(--primary-soft)]',
        !selected &&
          tone === 'danger' &&
          'shadow-[inset_3px_0_0_var(--danger)]',
        className
      )}
      {...props}
    />
  );
}

export interface TableHeadProps
  extends ThHTMLAttributes<HTMLTableCellElement>,
    TableCellPaddingProps {}

export function TableHead({ className, padding, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 border-b border-line px-0 text-left align-middle text-label uppercase tracking-[0.06em] text-faint font-semibold',
        tableCellPaddingVariants({ padding }),
        className
      )}
      {...props}
    />
  );
}

export interface TableCellProps
  extends TdHTMLAttributes<HTMLTableCellElement>,
    TableCellPaddingProps {}

export function TableCell({ className, padding, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'min-w-0 border-b border-line px-0 py-[18px] align-middle',
        tableCellPaddingVariants({ padding }),
        className
      )}
      {...props}
    />
  );
}
