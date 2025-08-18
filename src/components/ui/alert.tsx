'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Info,
  Check,
  AlertTriangle,
  CircleAlert,
} from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary'
  hideIcon?: boolean
}

type Variant = NonNullable<AlertProps['variant']>

const containerColors: Record<Variant, string> = {
  default: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  secondary: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
}

const iconWrapperColors: Record<Variant, string> = {
  default: 'bg-gray-700 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-yellow-600 text-white',
  danger: 'bg-red-600 text-white',
  primary: 'bg-blue-600 text-white',
  secondary: 'bg-purple-600 text-white',
}

const ringOffsetColors: Record<Variant, string> = {
  default: 'ring-offset-gray-200',
  success: 'ring-offset-green-200',
  warning: 'ring-offset-yellow-200',
  danger: 'ring-offset-red-200',
  primary: 'ring-offset-blue-200',
  secondary: 'ring-offset-purple-200',
}

const iconByVariant: Record<Variant, React.ReactNode> = {
  default: <Info className="h-4 w-4" />,
  primary: <Info className="h-4 w-4" />,
  secondary: <CircleAlert className="h-4 w-4" />,
  success: <Check className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  danger: <CircleAlert className="h-4 w-4" />,
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', hideIcon = false, children, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        // container
        'relative w-full rounded-xl px-5 py-4',
        'shadow-sm',
        containerColors[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {!hideIcon && (
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full flex-none shrink-0 shadow-sm ring-1 ring-white ring-offset-8 ml-2 mr-3',
              iconWrapperColors[variant],
              ringOffsetColors[variant]
            )}
            aria-hidden
          >
            {iconByVariant[variant]}
          </span>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription } 