import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../main';

describe('Smoke test', () => {
  it('renders index placeholder via app shell', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('FocusLearn');
  });
});
