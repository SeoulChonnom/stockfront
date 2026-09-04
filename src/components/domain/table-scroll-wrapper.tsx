import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function TableScrollWrapper({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
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

      const maxScroll = node.scrollWidth - node.clientWidth;
      const scrollable = maxScroll > 1;

      setEdges({
        scrollable,
        start: scrollable && node.scrollLeft > 1,
        end: scrollable && node.scrollLeft < maxScroll - 1,
      });
    }

    measure();

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
