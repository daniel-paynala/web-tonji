import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }

export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={clsx('relative', sizeClasses[size], className)} role="status" aria-label="Chargement">
      <svg className="animate-spin w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="text-border" />
        <path
          d="M12 3a9 9 0 019 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary"
        />
      </svg>
    </div>
  )
}
