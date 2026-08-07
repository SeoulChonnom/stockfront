import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

export type PermissionStateProps = {
  onNavigateToLatest?: () => void;
  className?: string;
  headingLevel?: 'h1' | 'h2';
  titleId?: string;
};

function goToLatestBrief() {
  navigate('/market/latest');
}

export function PermissionState({
  onNavigateToLatest,
  className,
  headingLevel = 'h1',
  titleId,
}: PermissionStateProps) {
  const Heading = headingLevel;
  const resolvedTitleId = titleId ?? 'page-title';

  return (
    <div
      className={cn('mx-auto max-w-[440px] px-4 py-8 text-center', className)}
    >
      <span className='inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-body-sm font-semibold text-[color:var(--danger)]'>
        403 · FORBIDDEN
      </span>
      <Heading
        className='mt-3 mb-2 text-[22px] font-semibold text-fg'
        id={resolvedTitleId ?? undefined}
        tabIndex={-1}
      >
        이 화면에 접근할 권한이 없습니다
      </Heading>
      <p className='wrap-anywhere mb-5 text-body text-fg-soft'>
        이 화면은 파이프라인 로그와 수동 실행을 포함하므로 관리자(ADMIN) 권한이
        있는 계정만 열 수 있습니다. 현재 계정은 일반 사용자입니다.
      </p>
      <Button onClick={onNavigateToLatest ?? goToLatestBrief} type='button'>
        최신 브리프로 이동
      </Button>
    </div>
  );
}
