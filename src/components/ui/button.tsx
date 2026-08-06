import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/*
 * C1: design buttons are `border-radius:var(--r-md)` (8px, not the
 * previous pill-ish 14px) at `font-weight:600` (not 700/`font-bold`).
 * Font-size is explicit per size tier (13.5px default — matches the
 * measured `trigger-btn`/`필터 적용`; 12.5px for the smaller `sm` tier —
 * matches `실패만 보기`/`필터 해제`) rather than inheriting whatever the
 * ambient text size happens to be.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border font-semibold transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // C1: design is a flat `border:1px solid var(--accent);
        // background:var(--accent)` — a solid fill, not a gradient. The
        // previous gradient's two stops were already the same color (so it
        // never looked different), but it meant `background-color`/
        // `border-color` never showed up as the actual token value.
        // U5 (parity cycle 5): design buttons carry no box-shadow at all —
        // README §6 reserves shadow for sticky/overlay surfaces (`--sh2`/
        // `--sh3`), not buttons. The previous drop shadow here was inline
        // decoration invented past the design, not a value the reference
        // ever expressed.
        primary:
          'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:-translate-y-px',
        secondary:
          'border-[color:var(--line-strong)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] text-[color:var(--text)] hover:-translate-y-px',
        ghost:
          'border-[color:var(--line)] bg-transparent text-[color:var(--text-soft)] hover:-translate-y-px',
        /* README §6 상태 색 사용 규칙과 같은 tone/soft/line 조합 — 위험한
           동작(재실행 취소 등)임을 알리되 화면 전체를 빨갛게 물들이지
           않는다. 명도 대비도 다크/라이트 양쪽에서 이미 검증된 badge
           토큰 페어를 재사용하므로 별도 확인 없이 AA를 만족한다. */
        danger:
          'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)] hover:-translate-y-px',
      },
      size: {
        // C1: design buttons consistently use 18px horizontal padding
        // (trigger-btn/필터 적용/수동 실행/…), not 16/20px.
        default: 'min-h-11 px-[18px] text-[13.5px]',
        sm: 'min-h-10 px-3.5 text-[12.5px]',
        lg: 'min-h-12 px-[18px] text-[13.5px]',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** 진행 중 표시. 스피너를 보여주고 클릭을 막지만 접근 가능한 이름(children 텍스트)은 그대로 유지한다. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // Radix's Slot (asChild) requires exactly one child element to clone onto
  // — injecting a sibling spinner icon there would break
  // `React.Children.only`. asChild callers own their single child as-is;
  // the loading spinner only applies to the plain <button> path.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? (
        <Loader2 aria-hidden='true' className='size-4 animate-spin' />
      ) : null}
      {children}
    </>
  );

  return (
    <Comp
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </Comp>
  );
}
