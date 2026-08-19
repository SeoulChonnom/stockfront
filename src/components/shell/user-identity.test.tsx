import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import { NavRail } from './nav-rail';

/**
 * 셸이 표시하는 사용자 신원. 예전에는 `ops.analyst`가 리터럴로 박혀 있어
 * 누가 로그인하든 같은 이름이 나왔다. 두 분기를 모두 고정한다 — 이름이 있으면
 * 그대로 쓰고, 없으면 자리표시자를 만들지 않고 역할만 남긴다.
 */
const mockUseAuthUserName = vi.hoisted(() => vi.fn<() => string | null>());

vi.mock('@/lib/auth-user', () => ({
  useAuthUserName: mockUseAuthUserName,
}));

/** 신원 블록의 문단만 고른다(역할 시뮬레이터 버튼과 라벨이 겹친다). */
function roleParagraphs(label: string) {
  return screen
    .getAllByText(label)
    .filter((element) => element.tagName === 'P');
}

function renderRail() {
  return render(
    <NavRail
      currentRouteKey='market-latest'
      failedCount={null}
      onToggleTheme={() => undefined}
      pathname='/market/latest'
      searchParams={new URLSearchParams()}
      theme='light'
    />
  );
}

afterEach(() => {
  resetRoleOverrideForTesting();
  mockUseAuthUserName.mockReset();
});

describe('shell user identity', () => {
  it('renders the name from the token response, not a hardcoded literal', () => {
    setRoleOverride('admin');
    mockUseAuthUserName.mockReturnValue('류지호');

    renderRail();

    expect(screen.getByText('류지호')).toBeInTheDocument();
    // DEV 전용 `DevRoleSimulator`가 같은 라벨의 버튼을 그리므로 신원 블록의
    // 문단만 센다.
    expect(roleParagraphs('Admin')).toHaveLength(1);
    expect(screen.queryByText('ops.analyst')).not.toBeInTheDocument();
  });

  it('drops the name line entirely when the token carries no name', () => {
    setRoleOverride('user');
    mockUseAuthUserName.mockReturnValue(null);

    renderRail();

    // 역할만 남는다. 빈 줄도, 자리표시자도 남기지 않는다.
    expect(roleParagraphs('User')).toHaveLength(1);
    expect(screen.queryByText('ops.analyst')).not.toBeInTheDocument();
  });
});
