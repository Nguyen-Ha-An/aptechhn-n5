/**
 * UI Component Library - Notion/Linear Inspired Design System
 */

import React from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Star,
  Plus,
} from 'lucide-react';

// ============================================
// Button Component
// ============================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
  };

  const sizes = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
    icon: 'h-8 w-8',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

// ============================================
// Card Component
// ============================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${
        hover ? 'hover:border-gray-300 hover:shadow-md cursor-pointer transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendValue,
  className = '',
}) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trendValue && (
            <p className={`text-xs font-medium ${trendColors[trend || 'neutral']}`}>{trendValue}</p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
};

// ============================================
// Empty State Component
// ============================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          <Plus className="w-4 h-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
};

// ============================================
// Input Component
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          )}
          <input
            ref={ref}
            className={`w-full h-9 px-3 ${
              icon ? 'pl-10' : ''
            } text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 ${
              error ? 'border-red-500' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

// ============================================
// Select Component
// ============================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// ============================================
// Badge Component
// ============================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    outline: 'border border-gray-300 text-gray-700',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-md ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

// ============================================
// Skeleton Component
// ============================================
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
};

// ============================================
// Avatar Component
// ============================================
interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name = '', src, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return <img src={src} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-medium ${sizes[size]} ${className}`}
    >
      {initials || '?'}
    </div>
  );
};

// ============================================
// Drawer / Right Panel Component
// ============================================
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  children,
  width = 'md',
}) => {
  if (!open) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full ${widths[width]} w-full bg-white shadow-xl border-l border-gray-200 animate-in slide-in-from-right duration-200`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        {/* Content */}
        <div className="overflow-y-auto h-full pb-20">{children}</div>
      </div>
    </div>
  );
};

// ============================================
// Modal Component
// ============================================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Content */}
      <div
        className={`relative ${sizes[size]} w-full bg-white rounded-lg shadow-xl animate-in zoom-in-95 duration-150`}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// ============================================
// Toast Component
// ============================================
interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onDismiss }) => {
  const icons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
  };

  const colors = {
    info: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg ${colors[type]} animate-in slide-in-from-bottom-4 duration-200`}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ============================================
// Divider Component
// ============================================
export const Divider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`h-px bg-gray-200 ${className}`} />;
};

// ============================================
// List Item Component
// ============================================
interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  className?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  onClick,
  active = false,
  icon,
  suffix,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'
      } ${className}`}
    >
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="flex-1 text-sm font-medium truncate">{children}</span>
      {suffix && <span className="text-gray-400">{suffix}</span>}
    </div>
  );
};

// ============================================
// Progress Bar Component
// ============================================
interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'sm',
  color = 'primary',
}) => {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2',
  };

  const colors = {
    primary: 'bg-indigo-600',
    success: 'bg-green-600',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes[size]}`}>
      <div
        className={`${colors[color]} ${sizes[size]} transition-all duration-300`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

// ============================================
// Keyboard Shortcut Component
// ============================================
interface KbdProps {
  children: React.ReactNode;
}

export const Kbd: React.FC<KbdProps> = ({ children }) => {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded">
      {children}
    </kbd>
  );
};

// ============================================
// Toggle / Switch Component
// ============================================
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled = false }) => {
  return (
    <label className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

// ============================================
// Segmented Control Component
// ============================================
interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div className={`inline-flex p-1 bg-gray-100 rounded-lg ${fullWidth ? 'w-full' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Textarea Component
// ============================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 resize-none ${
            error ? 'border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
