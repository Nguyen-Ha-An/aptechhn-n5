import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BarChart } from './BarChart';

describe('BarChart component', () => {
  const sampleData = [
    { label: 'Mon', value: 25 },
    { label: 'Tue', value: 45 },
    { label: 'Wed', value: 60, isCurrent: true },
    { label: 'Thu', value: 0 },
  ];

  it('renders accessible table under the chart with correct data', () => {
    render(
      <BarChart
        data={sampleData}
        ariaLabel="Focus minutes per day"
        valueLabel={(v) => `${v} minutes`}
      />,
    );

    // Verify table accessibility
    const table = screen.getByRole('table', { hidden: true });
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass('sr-only');

    // Caption
    const caption = screen.getByText('Focus minutes per day', { selector: 'caption' });
    expect(caption).toBeInTheDocument();

    // Headers
    expect(screen.getByRole('columnheader', { name: 'Time period', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Focus minutes', hidden: true })).toBeInTheDocument();

    // Rows
    expect(screen.getByRole('cell', { name: 'Mon', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '25 minutes', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Wed', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '60 minutes', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '0 minutes', hidden: true })).toBeInTheDocument();
  });

  it('renders SVG with rect elements and highlights current day in accent', () => {
    const { container } = render(
      <BarChart
        data={sampleData}
        ariaLabel="Weekly focus"
      />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');

    // Bars (3 non-zero bars)
    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(3);

    // Today's bar should use accent fill
    const accentRect = Array.from(rects).find((r) => r.getAttribute('fill') === 'var(--color-accent)');
    expect(accentRect).toBeDefined();

    // Other bars should use ink fill
    const inkRects = Array.from(rects).filter((r) => r.getAttribute('fill') === 'var(--color-ink)');
    expect(inkRects).toHaveLength(2);
  });
});
