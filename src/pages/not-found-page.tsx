import { PanelsTopLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { createNavigateHandler } from '../lib/app-state';

export function NotFoundPage() {
  return (
    <section className="empty-state">
      <PanelsTopLeft size={34} />
      <h1>Route not found</h1>
      <p>정의되지 않은 경로입니다. PoC 범위의 화면으로 다시 이동하세요.</p>
      <Button asChild variant="primary">
        <a
          href="/market/latest"
          onClick={createNavigateHandler('/market/latest')}
        >
          Latest Market으로 이동
        </a>
      </Button>
    </section>
  );
}
