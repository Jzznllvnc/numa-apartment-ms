'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
  className?: string
}

export function Tooltip({ 
  content, 
  children, 
  side = 'right', 
  delay = 500,
  disabled = false,
  className 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showTooltip = () => {
    if (disabled || !mounted) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        let x = 0
        let y = 0

        switch (side) {
          case 'top':
            x = rect.left + rect.width / 2
            y = rect.top - 12
            break
          case 'bottom':
            x = rect.left + rect.width / 2
            y = rect.bottom + 12
            break
          case 'left':
            x = rect.left - 12
            y = rect.top + rect.height / 2
            break
          case 'right':
            x = rect.right + 12
            y = rect.top + rect.height / 2
            break
        }

        setPosition({ x, y })
        setIsVisible(true)
      }
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTooltipClasses = () => {
    const baseClasses = cn(
      'fixed z-[9999] px-3 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-lg shadow-xl',
      'transition-all duration-200 ease-in-out',
      'border border-blue-500 dark:border-blue-600',
      'whitespace-nowrap',
      'pointer-events-none',
      'backdrop-blur-sm',
      className
    )

    const positionClasses = {
      top: 'transform -translate-x-1/2 -translate-y-full',
      bottom: 'transform -translate-x-1/2 translate-y-0',
      left: 'transform -translate-x-full -translate-y-1/2',
      right: 'transform translate-x-0 -translate-y-1/2',
    }

    const visibilityClasses = isVisible 
      ? 'opacity-100 scale-100' 
      : 'opacity-0 scale-95'

    return `${baseClasses} ${positionClasses[side]} ${visibilityClasses}`
  }

  const getArrowClasses = () => {
    const baseArrowClasses = 'absolute w-2 h-2 bg-blue-600 dark:bg-blue-700 border border-blue-500 dark:border-blue-600 transform rotate-45'
    
    const arrowPositionClasses = {
      top: 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2',
      bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
      left: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2',
      right: 'right-full top-1/2 translate-x-1/2 -translate-y-1/2',
    }

    return `${baseArrowClasses} ${arrowPositionClasses[side]}`
  }

  const tooltipContent = mounted && isVisible && (
    <div
      className={getTooltipClasses()}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={getArrowClasses()} />
      {content}
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block w-full"
      >
        {children}
      </div>
      
      {mounted && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
} 