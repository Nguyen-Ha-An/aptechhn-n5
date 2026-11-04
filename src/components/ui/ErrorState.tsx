import type { ReactNode } from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  message?: ReactNode;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'An unexpected error occurred. Please try again.',
  title = 'Something went wrong',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-[6px] border border-rule bg-surface/50 p-8 text-center ${className}`.trim()}
    >
      <h3 className="font-serif text-base font-semibold text-danger">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
