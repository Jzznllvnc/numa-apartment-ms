'use client'

import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

type OptionElement = React.ReactElement<{
  value?: string | number
  disabled?: boolean
  children?: React.ReactNode
}>

export interface SelectProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'children'> {
  value?: string | number
  onChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  required?: boolean
  name?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(({ className, children, placeholder = 'Select option', value, onChange, disabled, required, name, id, ...buttonProps }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState<string>(value !== undefined ? String(value) : '')
  const [selectedLabel, setSelectedLabel] = React.useState('')
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [positionStyle, setPositionStyle] = React.useState<React.CSSProperties>({})
  const [renderAbove, setRenderAbove] = React.useState(false)

  React.useEffect(() => {
    if (value !== undefined) setSelectedValue(String(value))
  }, [value])

  const options = React.Children.toArray(children).filter((child): child is OptionElement => React.isValidElement(child as any) && (child as any).type === 'option')

  React.useEffect(() => {
    const selectedOption = options.find((option) => String(option.props.value) === String(selectedValue))
    setSelectedLabel((selectedOption?.props.children as any) || '')
  }, [selectedValue, options])

  React.useEffect(() => {
    const close = (event: Event) => {
      const target = event.target as Node
      const insideTrigger = !!triggerRef.current && triggerRef.current.contains(target)
      const insidePopover = !!popoverRef.current && popoverRef.current.contains(target)
      if (!isOpen) return
      if (insideTrigger || insidePopover) return
      setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    if (isOpen) {
      window.addEventListener('pointerdown', close, { capture: true })
      window.addEventListener('keydown', onKey)
    }
    return () => {
      window.removeEventListener('pointerdown', close as any, { capture: true } as any)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string, optionLabel: string) => {
    setSelectedValue(optionValue)
    setSelectedLabel(optionLabel)
    onChange?.(optionValue)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    if (disabled) return
    const next = !isOpen
    setIsOpen(next)
    if (next && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = Math.min(240, spaceBelow)
      const shouldRenderAbove = spaceBelow < 200 && rect.top > spaceBelow
      setRenderAbove(shouldRenderAbove)
      const top = shouldRenderAbove ? rect.top + window.scrollY - dropdownHeight - 8 : rect.bottom + window.scrollY + 4
      setPositionStyle({ position: 'absolute', left: rect.left + window.scrollX, top, width: rect.width, zIndex: 110 })
    }
  }

  const dropdown = (
    <div ref={popoverRef} style={positionStyle} className="z-[110]">
      <div className={cn('bg-popover border border-border rounded-md shadow-lg', renderAbove ? 'mb-1' : 'mt-1')}>
        <div role="listbox" className="max-h-60 overflow-auto p-1 w-full">
          {options.map((option, index) => {
            const optionValue = String(option.props.value ?? '')
            const optionLabel = String(option.props.children ?? '')
            const isSelected = optionValue === String(selectedValue)
            return (
              <div
                key={index}
                role="option"
                aria-selected={isSelected}
                className={cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground', isSelected && 'bg-accent text-accent-foreground', option.props.disabled && 'pointer-events-none opacity-50')}
                onClick={() => !option.props.disabled && handleSelect(optionValue, optionLabel)}
              >
                <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                <span className="block truncate">{optionLabel}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative" ref={ref as any}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        {...buttonProps}
      >
        <span className={cn('block truncate', !selectedLabel && 'text-muted-foreground')}>{selectedLabel || placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(dropdown, document.body)}

      <input type="hidden" name={name || 'select'} value={selectedValue} required={required} />
    </div>
  )
})
Select.displayName = 'Select'

export { Select }
