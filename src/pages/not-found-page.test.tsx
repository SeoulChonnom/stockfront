import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
import { NotFoundPage } from './not-found-page';

afterEach(() => {
  resetRoleOverrideForTesting();
});

describe('NotFoundPage', () => {
  it('operator: shows the 404 badge', () => {
    setRoleOverride('admin');
    render(<NotFoundPage />);

    expect(
      screen.getByText('이 주소에 해당하는 화면이 없습니다')
    ).toBeInTheDocument();
    expect(screen.getByText('404 · ROUTE_NOT_FOUND')).toBeInTheDocument();
  });

  it('regular user: hides the 404 badge', () => {
    setRoleOverride('user');
    render(<NotFoundPage />);

    expect(
      screen.getByText('이 주소에 해당하는 화면이 없습니다')
    ).toBeInTheDocument();
    expect(screen.queryByText('404 · ROUTE_NOT_FOUND')).not.toBeInTheDocument();
  });
});
