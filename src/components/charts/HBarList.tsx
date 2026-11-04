export interface HBarListItem {
  label: string;
  value: number;
}

export interface HBarListProps {
  data: HBarListItem[];
  ariaLabel?: string;
  valueLabel?: (v: number) => string;
  className?: string;
}

export function HBarList({
  data,
  ariaLabel = 'Categories list',
  valueLabel = (v) => `${v}`,
  className = '',
}: HBarListProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={`w-full space-y-3 ${className}`.trim()}>
      <ul className="space-y-3" aria-hidden="true">
        {data.map((item, idx) => {
          const percentage = Math.min(100, Math.round((item.value / maxValue) * 100));

          return (
            <li key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink truncate mr-2">{item.label}</span>
                <span className="text-muted tabular-nums shrink-0">{valueLabel(item.value)}</span>
              </div>
              <div className="h-2 w-full rounded-[3px] bg-surface overflow-hidden">
                <div
                  className="h-full rounded-[3px] bg-ink/85 transition-all duration-120"
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Accessible table representation */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Count</th>
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
