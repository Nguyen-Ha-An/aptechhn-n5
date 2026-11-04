import type { HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  className?: string;
}

export function Skeleton({ rows = 3, className = '', ...props }: SkeletonProps) {
  const barRows = Array.from({ length: rows });

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      className={`space-y-3 ${className}`.trim()}
      {...props}
    >
      {barRows.map((_, i) => {
        // Vary width naturally to mimic text lines without looking artificial
        const widthClass = i === 0 ? 'w-1/3' : i === rows - 1 ? 'w-2/3' : 'w-full';
        return (
          <div
            key={i}
            aria-hidden="true"
            className={`h-4 ${widthClass} animate-pulse rounded-[4px] bg-rule/70`}
          />
        );
      })}
    </div>
  );
}
