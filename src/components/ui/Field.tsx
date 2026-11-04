import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

type BaseElementProps = Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  'children'
>;

export interface FieldProps extends BaseElementProps {
  label: ReactNode;
  as?: 'input' | 'textarea';
  hint?: ReactNode;
  error?: ReactNode;
  children?: ReactNode;
  containerClassName?: string;
}

export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(function Field(
  {
    label,
    as = 'input',
    hint,
    error,
    children,
    id: externalId,
    className = '',
    containerClassName = '',
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedByList = [hintId, errorId].filter(Boolean);
  const describedBy = describedByList.length > 0 ? describedByList.join(' ') : undefined;

  const controlStyles = `w-full rounded-[6px] border ${
    error ? 'border-danger' : 'border-rule'
  } bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-120 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim();

  return (
    <div className={`flex flex-col text-left ${containerClassName}`}>
      <label htmlFor={id} className="mb-1.5 text-xs font-medium text-ink">
        {label}
      </label>

      {children ? (
        children
      ) : as === 'textarea' ? (
        <textarea
          ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={controlStyles}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as React.ForwardedRef<HTMLInputElement>}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={controlStyles}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
