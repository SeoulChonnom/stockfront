import { StatusCard } from '@/components/shell/status-card';
import { Button } from '@/components/ui/button';

import { createNavigateHandler } from '../lib/app-state';
import { errorCodeCopy } from '../lib/audience-copy';
import { useCapabilities } from '../lib/capabilities';
import { withBasePath } from '../lib/router';

/**
 * 404 page. Renders inside `AppShell`'s `<main>` (nav rail/header
 * stay visible; this is a normal in-app route, unlike the shell-less
 * auth-bootstrap states in `App.tsx`), so `fullScreen={false}`.
 *
 * `titleId="page-title"` makes route changes focus the page title for this
 * route the same way it already does for the other four pages that have
 * had a `#page-title` heading since before this phase.
 *
 * `app-page-content.tsx` (a different agent's file-ownership scope) routes
 * here with no props at all, so this reads its own audience via
 * `useCapabilities()` rather than requiring a prop threaded through that
 * file.
 */
export function NotFoundPage() {
  const { can } = useCapabilities();
  const audience = { canViewOps: can('ops.view') };

  return (
    <StatusCard
      actions={
        <Button asChild variant='primary'>
          <a
            href={withBasePath('/market/latest')}
            onClick={createNavigateHandler('/market/latest')}
          >
            최신 브리프로 이동
          </a>
        </Button>
      }
      badge={errorCodeCopy(audience, '404 · ROUTE_NOT_FOUND')}
      description='주소가 바뀌었거나 잘못 입력됐을 수 있습니다. 최신 브리프에서 다시 시작하세요.'
      fullScreen={false}
      title='이 주소에 해당하는 화면이 없습니다'
      titleId='page-title'
      tone='danger'
    />
  );
}
