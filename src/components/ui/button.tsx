import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border font-bold transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-transparent text-white shadow-[0_16px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)] bg-[linear-gradient(135deg,var(--primary),var(--primary))] hover:-translate-y-px',
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
        default: 'min-h-11 px-4',
        sm: 'min-h-10 px-3.5 text-sm',
        lg: 'min-h-12 px-5',
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
