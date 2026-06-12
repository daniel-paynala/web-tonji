import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'text-white shadow-lg',
    'hover:shadow-glow-primary hover:-translate-y-1',
    'active:translate-y-0 active:shadow-sm',
  ].join(' '),

  accent: [
    'text-white shadow-lg',
    'hover:shadow-glow hover:-translate-y-px',
    'active:translate-y-0 active:shadow-sm',
  ].join(' '),

  outline: [
    'border border-border-strong text-text-strong bg-transparent',
    'hover:border-primary hover:text-primary hover:bg-surface-deep hover:-translate-y-1',
    'active:translate-y-0',
  ].join(' '),

  ghost: [
    'text-text-secondary bg-transparent',
    'hover:bg-surface-deep hover:text-text-strong',
    'active:bg-border',
  ].join(' '),

  danger: [
    'text-white shadow-sm',
    'hover:opacity-90 hover:-translate-y-px',
    'active:translate-y-0',
  ].join(' '),
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs font-semibold tracking-wide min-h-[34px] rounded-md',
  md: 'px-5 py-2.5 text-sm font-semibold tracking-wide min-h-[42px] rounded-lg',
  lg: 'px-7 py-3.5 text-sm font-semibold tracking-wider min-h-[50px] rounded-lg',
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, #0F4C5C 0%, #0A3540 100%)' },
  accent:  { background: 'linear-gradient(135deg, #C97B4A 0%, #B76E45 100%)' },
  outline: {},
  ghost:   {},
  danger:  { backgroundColor: '#A04434' },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className, style, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={{ ...variantStyles[variant], ...style }}
        className={clsx(
          'inline-flex items-center justify-center gap-2.5',
          'transition-all duration-150 ease-smooth cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
