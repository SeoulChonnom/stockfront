import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { PermissionState } from './permission-state';

it('provides the standard route-focus heading and a working safe destination', async () => {
  const user = userEvent.setup();
  const onNavigateToLatest = vi.fn();
  render(<PermissionState onNavigateToLatest={onNavigateToLatest} />);

  const heading = screen.getByRole('heading', {
    level: 1,
    name: '이 화면에 접근할 권한이 없습니다',
  });
  expect(heading).toHaveAttribute('id', 'page-title');
  expect(heading).toHaveAttribute('tabindex', '-1');

  await user.click(screen.getByRole('button', { name: '최신 브리프로 이동' }));
  expect(onNavigateToLatest).toHaveBeenCalledOnce();
});
