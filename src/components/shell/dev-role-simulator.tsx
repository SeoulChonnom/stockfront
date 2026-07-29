import { Button } from '@/components/ui/button';
import { setRoleOverride, useRole } from '@/lib/capabilities';

/**
 * Rail-footer "상태 시뮬레이터" — README §5 "(개발 빌드에서만) 상태
 * 시뮬레이터". Gated behind `import.meta.env.DEV` by the caller
 * (`nav-rail.tsx`) — this component itself has no env check, it's simply
 * never imported/rendered in a production build's code path.
 *
 * Flips the single-source-of-truth role override in `src/lib/capabilities.ts`
 * so a developer can preview User vs Admin nav/screens without a real
 * backend `roleList` (README §10).
 */
export function DevRoleSimulator() {
  const role = useRole();

  return (
    <div className='flex items-center gap-1 rounded-[var(--r-md)] border border-[color:var(--line)] bg-[color:var(--surface-2)] p-1'>
      <span className='px-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text-faint)]'>
        DEV
      </span>
      <Button
        aria-pressed={role === 'user'}
        onClick={() => setRoleOverride('user')}
        size='sm'
        type='button'
        variant={role === 'user' ? 'primary' : 'ghost'}
      >
        User
      </Button>
      <Button
        aria-pressed={role === 'admin'}
        onClick={() => setRoleOverride('admin')}
        size='sm'
        type='button'
        variant={role === 'admin' ? 'primary' : 'ghost'}
      >
        Admin
      </Button>
    </div>
  );
}
