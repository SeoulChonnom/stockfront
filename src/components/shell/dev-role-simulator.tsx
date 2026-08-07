import { Button } from '@/components/ui/button';
import { setRoleOverride, useRole } from '@/lib/capabilities';

/** Development-only role preview; the caller gates this component behind DEV. */
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
