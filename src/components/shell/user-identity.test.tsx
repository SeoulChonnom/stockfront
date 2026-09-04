import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileMenu } from '@/components/shell/profile-menu';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

/**
 * 셸이 표시하는 사용자 신원. 예전에는 `ops.analyst`가 리터럴로 박혀 있어
 * 누가 로그인하든 같은 이름이 나왔다. 두 분기를 모두 고정한다 — 이름이 있으면
 * 그대로 쓰고, 없으면 자리표시자를 만들지 않고 역할만 남긴다.
 */
const mockUseAuthUserName = vi.hoisted(() => vi.fn<() => string | null>());

vi.mock('@/lib/auth-user', () => ({
  useAuthUserName: mockUseAuthUserName,
}));

async function openProfileMenu() {
  const user = userEvent.setup();
  render(<ProfileMenu onToggleTheme={() => undefined} theme='light' />);
  await user.click(screen.getByRole('button', { name: /계정 메뉴/ }));

  return screen.getByRole('menu');
}

afterEach(() => {
  resetRoleOverrideForTesting();
  mockUseAuthUserName.mockReset();
});

describe('shell user identity', () => {
  it('renders the name from the token response, not a hardcoded literal', async () => {
    setRoleOverride('admin');
    mockUseAuthUserName.mockReturnValue('류지호');

    const menu = await openProfileMenu();

    expect(within(menu).getByText('류지호')).toBeInTheDocument();
    expect(within(menu).getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('ops.analyst')).not.toBeInTheDocument();
  });

  it('drops the name line entirely when the token carries no name', async () => {
    setRoleOverride('user');
    mockUseAuthUserName.mockReturnValue(null);

    const menu = await openProfileMenu();

    // 역할만 남는다. 빈 줄도, 자리표시자도 남기지 않는다.
    expect(within(menu).getByText('User')).toBeInTheDocument();
    expect(screen.queryByText('ops.analyst')).not.toBeInTheDocument();
  });

  it('names the trigger with the signed-in user so an avatar-only header is still readable', async () => {
    setRoleOverride('admin');
    mockUseAuthUserName.mockReturnValue('류지호');

    render(<ProfileMenu onToggleTheme={() => undefined} theme='light' />);

    expect(
      screen.getByRole('button', { name: '계정 메뉴 · 류지호' })
    ).toBeInTheDocument();
  });
});
