import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  icon?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  icon,
  meta,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`border-b border-rule pb-4 mb-6 ${className}`.trim()}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span
              className="text-2xl md:text-3xl select-none shrink-0"
              role="img"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink tracking-tight truncate">
              {title}
            </h1>
            {meta && <div className="mt-0.5 text-sm text-muted">{meta}</div>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
