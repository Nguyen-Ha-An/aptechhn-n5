import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigurationMissing } from './ConfigurationMissing';

describe('ConfigurationMissing', () => {
  it('renders configuration missing error heading and message', () => {
    render(<ConfigurationMissing />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Configuration missing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY/),
    ).toBeInTheDocument();
  });
});
