import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * 호버와 누름은 서로 다른 것을 말해야 한다.
 *
 * 예전에는 네 변종 모두 `hover:-translate-y-px` 하나만 가지고 있었고,
 * 누름 상태는 아예 없었다. 그래서 문제가 둘이었다. 호버 신호가 **대상을
 * 커서 밑에서 움직였고**(44px 컨트롤에서 굳이 치를 이유가 없는 비용이다),
 * 조회·필터 적용·재실행처럼 결과가 무거운 동작을 눌러도 아무 반응이
 * 없었다 — 응답이 오기 전까지 눌렸는지조차 알 수 없었다.
 *
 * 이제 호버는 색으로만 말하고(대상은 제자리에 있다), 누름이 움직임을
 * 가져간다. 98%는 44px에서 1px 남짓이라 눈에 띄기보다 손에 잡히는 크기다.
 * `--dur-fast`(120ms)는 즉각 피드백 구간이며, 이보다 길면 지연으로 읽힌다.
 *
 * 트랜지션 목록에 `transform`이 아니라 `scale`이 들어가는 것은 오타가
 * 아니다. Tailwind v4의 `scale-*`는 `transform: scale(...)`이 아니라
 * 독립 `scale` 속성으로 컴파일된다(빌드 산출물: `.active\\:scale-\\[0\\.98\\]:active{scale:.98}`).
 * `transform`을 적으면 트랜지션이 아무 것도 잡지 못해 누름이 끊긴다.
 *
 * 호버 색은 `--primary`를 `--text` 쪽으로 섞어 만든다. 검정으로 섞으면
 * 다크에서 어두워져 대비가 깎이는데, 전경 토큰 쪽으로 섞으면 라이트에서는
 * 짙어지고 다크에서는 밝아져 두 테마 모두 대비가 올라간다.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border font-semibold transition-[scale,background-color,border-color,color] duration-(--dur-fast) ease-(--ease) active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:border-[color:color-mix(in_srgb,var(--primary)_86%,var(--text))] hover:bg-[color:color-mix(in_srgb,var(--primary)_86%,var(--text))]',
        secondary:
          'border-[color:var(--line-strong)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] text-fg hover:bg-[color:var(--surface-2)]',
        ghost:
          'border-line bg-transparent text-fg-soft hover:bg-[color:var(--surface-2)] hover:text-fg',
        danger:
          'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)] hover:border-[color:var(--danger)]',
      },
      size: {
        default: 'min-h-tap px-[18px] text-body',
        sm: 'min-h-tap px-3.5 text-body-sm',
        lg: 'min-h-12 px-[18px] text-body',
        icon: 'size-tap',
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

  // Slot requires one child; keep the spinner on the plain button path only.
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
