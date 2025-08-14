'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X, TriangleAlert } from 'lucide-react'
import { Button } from './button'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideHeader?: boolean
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md', hideHeader = false }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`relative bg-white dark:bg-[#111827] rounded-lg shadow-xl transform transition-all w-full max-w-[calc(100vw-2rem)] ${sizeClasses[size]} overflow-hidden flex flex-col`}
        >
          {/* Header */}
          {!hideHeader && (
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4 bg-white dark:bg-[#111827] [&_input]:bg-background [&_input]:border-input [&_textarea]:bg-background [&_textarea]:border-input max-h-[75vh] overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmVariant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const [primaryText, secondaryText] = (() => {
    // Prefer splitting on a question mark first (common in our copy),
    // fallback to first period. Keep the delimiter on the first part when needed.
    const qIndex = message.indexOf('?')
    if (qIndex !== -1) {
      const head = message.slice(0, qIndex + 1).trim()
      const tail = message.slice(qIndex + 1).trim()
      return [head, tail]
    }
    const pIndex = message.indexOf('. ')
    if (pIndex !== -1) {
      const head = message.slice(0, pIndex + 1).trim()
      const tail = message.slice(pIndex + 1).trim()
      return [head, tail]
    }
    return [message, '']
  })()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md" hideHeader>
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TriangleAlert className="h-9 w-9 text-red-600" />
          </div>
          <div>
            <p className="text-xl font-semibold">{primaryText}</p>
            {secondaryText && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{secondaryText}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading} className={confirmVariant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
} 