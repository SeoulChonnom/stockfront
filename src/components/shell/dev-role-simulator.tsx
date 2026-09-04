import { Button } from '@/components/ui/button';
import { setRoleOverride, useRole } from '@/lib/capabilities';

/** Development-only role preview; the caller gates this component behind DEV. */
export function DevRoleSimulator() {
  const role = useRole();

  return (
    <div className='flex items-center gap-1 rounded-md border border-line bg-surface-2 p-1'>
      <span className='px-1 text-label font-semibold uppercase tracking-caps text-faint'>
        DEV
      </span>
      <Button
        aria-pressed={role === 'user'}
        onClick={() => setRoleOverride('user')}
        size='sm'
        type='button'
        variant={role === 'user' ? 'default' : 'ghost'}
      >
        User
      </Button>
      <Button
        aria-pressed={role === 'admin'}
        onClick={() => setRoleOverride('admin')}
        size='sm'
        type='button'
        variant={role === 'admin' ? 'default' : 'ghost'}
      >
        Admin
      </Button>
    </div>
  );
}
