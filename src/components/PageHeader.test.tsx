import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders exactly one h1 with title and optional icon, meta, and actions', () => {
    render(
      <PageHeader
        title="Settings"
        icon="⚙"
        meta="Manage your account preferences"
        actions={<button type="button">Save</button>}
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Settings');
    expect(screen.getByText('Manage your account preferences')).toBeInTheDocument();
    expect(screen.getByText('⚙')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
