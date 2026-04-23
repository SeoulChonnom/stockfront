import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders the topbar search as a disabled coming-soon field', () => {
    render(
      <AppShell
        onToggleTheme={() => undefined}
        pathname="/market/latest"
        placeholder="Search market briefs"
        theme="dark"
      >
        <div>Page content</div>
      </AppShell>
    );

    const searchInput = screen.getByRole('textbox', {
      name: 'Search market briefs (coming soon)',
    });

    expect(searchInput).toBeDisabled();
    expect(searchInput).toHaveAttribute(
      'placeholder',
      'Search market briefs (coming soon)'
    );
  });
});
