export interface BarChartItem {
  label: string;
  value: number;
  isCurrent?: boolean;
}

export interface BarChartProps {
  data: BarChartItem[];
  valueLabel?: (v: number) => string;
  ariaLabel: string;
  height?: number;
  className?: string;
}

export function BarChart({
  data,
  valueLabel = (v) => `${v} min`,
  ariaLabel,
  height = 160,
  className = '',
}: BarChartProps) {
  const width = 600;
  const top = 16;
  const bottom = 28;
  const left = 8;
  const right = 8;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const barSlot = n > 0 ? plotWidth / n : plotWidth;
  const barWidth = Math.max(2, Math.min(barSlot * 0.72, 32));

  // Determine whether to skip some labels if too crowded (e.g. 24 or 30 items)
  const shouldSkipLabels = n > 14;

  return (
    <div className={`w-full overflow-hidden ${className}`.trim()}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block select-none"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Baseline rule */}
        <line
          x1={left}
          y1={top + plotHeight}
          x2={width - right}
          y2={top + plotHeight}
          stroke="var(--color-rule)"
          strokeWidth="1"
        />

        {data.map((item, idx) => {
          const barHeight = item.value > 0 ? Math.max(2, (item.value / maxValue) * plotHeight) : 0;
          const x = left + idx * barSlot + (barSlot - barWidth) / 2;
          const y = top + plotHeight - barHeight;
          const isAccent = Boolean(item.isCurrent);

          // For skipped labels, show 1st, every 5th, and last
          const showLabel = !shouldSkipLabels || idx === 0 || idx === n - 1 || idx % 5 === 0;

          return (
            <g key={idx}>
              <title>{`${item.label}: ${valueLabel(item.value)}`}</title>
              {barHeight > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  ry="3"
                  fill={isAccent ? 'var(--color-accent)' : 'var(--color-ink)'}
                  fillOpacity={isAccent ? 1 : 0.85}
                />
              )}
              {showLabel && (
                <text
                  x={left + idx * barSlot + barSlot / 2}
                  y={top + plotHeight + 18}
                  textAnchor="middle"
                  fill="var(--color-muted)"
                  fontSize="11"
                  className="font-sans"
                >
                  {item.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Accessible screen-reader table representation */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Time period</th>
            <th scope="col">Focus minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx}>
              <td>{item.label}</td>
              <td>{valueLabel(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
