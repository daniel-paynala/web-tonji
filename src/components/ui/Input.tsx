import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {label}
            {required && <span className="text-accent ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-required={required}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            aria-invalid={!!error}
            className={clsx(
              'w-full px-4 py-3 rounded-lg text-sm text-text-strong bg-surface-elevated',
              'border transition-all duration-150',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'shadow-sm',
              'disabled:bg-surface disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-error/60 bg-red-50/50 focus:ring-error/30 focus:border-error'
                : 'border-border focus:border-primary/60 focus:ring-primary/20 hover:border-border-strong',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-error font-medium">
            <span className="w-1 h-1 rounded-full bg-error inline-block shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-text-tertiary leading-relaxed">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
