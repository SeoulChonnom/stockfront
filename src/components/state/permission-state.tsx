import { Button } from '@/components/ui/button';
import { navigate } from '@/lib/router';
import { cn } from '@/lib/utils';

export type PermissionStateProps = {
  onNavigateToLatest?: () => void;
  className?: string;
};

function goToLatestBrief() {
  navigate('/market/latest');
}

export function PermissionState({
  onNavigateToLatest,
  className,
}: PermissionStateProps) {
  return (
    <div
      className={cn('mx-auto max-w-[440px] px-4 py-8 text-center', className)}
    >
      <span className='inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-[12.5px] font-semibold text-[color:var(--danger)]'>
        403 · FORBIDDEN
      </span>
      <h1
        className='mt-3 mb-2 text-[22px] font-semibold text-[color:var(--text)]'
        id='page-title'
        tabIndex={-1}
      >
        이 화면에 접근할 권한이 없습니다
      </h1>
      <p className='wrap-anywhere mb-5 text-[13.5px] text-[color:var(--text-soft)]'>
        이 화면은 파이프라인 로그와 수동 실행을 포함하므로 관리자(ADMIN) 권한이
        있는 계정만 열 수 있습니다. 현재 계정은 일반 사용자입니다.
      </p>
      <Button onClick={onNavigateToLatest ?? goToLatestBrief} type='button'>
        최신 브리프로 이동
      </Button>
    </div>
  );
}
