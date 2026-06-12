import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  bordered?: boolean
  accentLeft?: boolean
  glass?: boolean
}

export default function Card({
  elevated = false,
  bordered = true,
  accentLeft = false,
  glass = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl p-6 transition-all duration-250',
        glass
          ? 'glass border border-white/20'
          : elevated
            ? 'bg-surface-elevated shadow-lg border border-border/60'
            : 'bg-surface-elevated shadow-sm border border-border/80',
        bordered && !glass && 'border',
        accentLeft && 'border-l-[3px] border-l-accent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
