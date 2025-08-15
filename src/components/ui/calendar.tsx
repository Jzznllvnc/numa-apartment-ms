"use client"

import * as React from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { createPortal } from 'react-dom'

export interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

type PickerMode = 'days' | 'months' | 'years'

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(({ className, placeholder = 'Select date', value, onChange, disabled, required, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(value || '')
  const [viewDate, setViewDate] = React.useState(new Date())
  const [mode, setMode] = React.useState<PickerMode>('days')
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const yearsListRef = React.useRef<HTMLDivElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({})
  const [renderAbove, setRenderAbove] = React.useState(false)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  React.useEffect(() => {
    const handleDown = (event: Event) => {
      const target = event.target as Node
      const insideTrigger = !!triggerRef.current && triggerRef.current.contains(target)
      const insidePopover = !!popoverRef.current && popoverRef.current.contains(target)
      if (!isOpen) return
      if (insideTrigger || insidePopover) return
      setIsOpen(false)
      setMode('days')
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setMode('days')
      }
    }
    if (isOpen) {
      window.addEventListener('pointerdown', handleDown, { capture: true })
      window.addEventListener('keydown', handleEscape)
    }
    return () => {
      window.removeEventListener('pointerdown', handleDown as any, { capture: true } as any)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    // Format date as YYYY-MM-DD in local timezone to avoid timezone conversion issues
    const year = newDate.getFullYear()
    const month = String(newDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(newDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    setSelectedDate(dateString)
    onChange?.(dateString)
    setIsOpen(false)
    setMode('days')
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  const CURRENT_YEAR = new Date().getFullYear()
  const YEARS_PAST = 120
  const YEARS_FUTURE = 120
  const years = React.useMemo(() => {
    return Array.from({ length: YEARS_PAST + YEARS_FUTURE + 1 }, (_, idx) => CURRENT_YEAR - YEARS_PAST + idx)
  }, [])

  const navigate = (direction: 'prev' | 'next') => {
    if (mode === 'years') {
      const container = yearsListRef.current
      if (container) {
        const delta = (direction === 'prev' ? -1 : 1) * (container.clientHeight - 40)
        container.scrollBy({ top: delta, behavior: 'smooth' })
      }
      return
    }

    const newDate = new Date(viewDate)
    if (mode === 'days') newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1))
    else if (mode === 'months') newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1))
    setViewDate(newDate)
  }

  const isToday = (date: Date) => new Date().toDateString() === date.toDateString()
  const isSelected = (date: Date) => (selectedDate ? new Date(selectedDate).toDateString() === date.toDateString() : false)
  const isCurrentMonth = (date: Date) => date.getMonth() === viewDate.getMonth()

  const onToggle = () => {
    if (disabled) return
    const next = !isOpen
    setIsOpen(next)
    if (next && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const heightGuess = 340
      const shouldAbove = spaceBelow < 300 && rect.top > spaceBelow
      setRenderAbove(shouldAbove)
      const top = shouldAbove ? rect.top + window.scrollY - heightGuess - 8 : rect.bottom + window.scrollY + 4
      setStyle({ position: 'absolute', left: rect.left + window.scrollX, top, width: Math.max(rect.width, 320), zIndex: 110 })
    }
  }

  const popup = (
    <div ref={popoverRef} style={style} className="z-[110]">
      <div className={cn('w-80 bg-popover border border-border rounded-md shadow-lg p-3', renderAbove ? 'mb-1' : 'mt-1')}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('prev')} className="h-7 w-7 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setMode('months')}>
              {monthNames[viewDate.getMonth()]}
            </button>
            <button type="button" className="text-sm font-semibold hover:underline" onClick={() => setMode('years')}>
              {viewDate.getFullYear()}
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('next')} className="h-7 w-7 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {mode === 'days' && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(viewDate).map((date, index) => (
                <button key={index} type="button" className={cn('h-8 w-8 text-sm rounded-md hover:bg-accent hover:text-accent-foreground', !isCurrentMonth(date) && 'text-muted-foreground opacity-50', isSelected(date) && 'bg-primary text-primary-foreground hover:bg-primary', isToday(date) && !isSelected(date) && 'bg-accent text-accent-foreground')} onClick={() => handleDateSelect(date.getDate())}>
                  {date.getDate()}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'months' && (
          <div className="grid grid-cols-3 gap-2 p-1">
            {monthNames.map((m, idx) => (
              <button key={m} type="button" className={cn('h-9 px-3 text-sm rounded-md hover:bg-accent hover:text-accent-foreground', viewDate.getMonth() === idx && 'bg-primary text-primary-foreground hover:bg-primary')} onClick={() => { setViewDate(new Date(viewDate.getFullYear(), idx, 1)); setMode('days') }}>
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        {mode === 'years' && (
          <div ref={yearsListRef} className="grid grid-cols-4 gap-2 p-1 max-h-64 overflow-auto">
            {years.map((year) => (
              <button key={year} type="button" className={cn('h-9 px-3 text-sm rounded-md hover:bg-accent hover:text-accent-foreground', viewDate.getFullYear() === year && 'bg-primary text-primary-foreground hover:bg-primary')} onClick={() => { setViewDate(new Date(year, viewDate.getMonth(), 1)); setMode('months') }}>
                {year}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={() => { 
            const today = new Date()
            const year = today.getFullYear()
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const day = String(today.getDate()).padStart(2, '0')
            const todayString = `${year}-${month}-${day}`
            setSelectedDate(todayString)
            onChange?.(todayString)
            setIsOpen(false)
            setMode('days')
          }}>
            Today
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedDate(''); onChange?.(''); setIsOpen(false); setMode('days') }}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} onClick={onToggle} disabled={disabled} {...props} ref={triggerRef}>
        <span className={cn('block truncate', !selectedDate && 'text-muted-foreground')}>{selectedDate ? formatDate(selectedDate) : placeholder}</span>
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && createPortal(popup, document.body)}

      <input type="hidden" name="date" value={selectedDate} required={required} />
    </div>
  )
})
DatePicker.displayName = 'DatePicker'

export interface MonthPickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

const MonthPicker = React.forwardRef<HTMLDivElement, MonthPickerProps>(({ className, placeholder = 'Select month', value, onChange, disabled, required, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedMonth, setSelectedMonth] = React.useState(value || '')
  const [viewYear, setViewYear] = React.useState(new Date().getFullYear())
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)
  const [style, setStyle] = React.useState<React.CSSProperties>({})
  const [renderAbove, setRenderAbove] = React.useState(false)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  React.useEffect(() => {
    const handleDown = (event: Event) => {
      const target = event.target as Node
      const insideTrigger = !!triggerRef.current && triggerRef.current.contains(target)
      const insidePopover = !!popoverRef.current && popoverRef.current.contains(target)
      if (!isOpen) return
      if (insideTrigger || insidePopover) return
      setIsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false)
    if (isOpen) {
      window.addEventListener('pointerdown', handleDown, { capture: true })
      window.addEventListener('keydown', onKey)
    }
    return () => {
      window.removeEventListener('pointerdown', handleDown as any, { capture: true } as any)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const formatMonth = (monthStr: string) => {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const onToggle = () => {
    if (disabled) return
    const next = !isOpen
    setIsOpen(next)
    if (next && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const heightGuess = 300
      const shouldAbove = spaceBelow < 260 && rect.top > spaceBelow
      setRenderAbove(shouldAbove)
      const top = shouldAbove ? rect.top + window.scrollY - heightGuess - 8 : rect.bottom + window.scrollY + 4
      setStyle({ position: 'absolute', left: rect.left + window.scrollX, top, width: Math.max(rect.width, 288), zIndex: 110 })
    }
  }

  const handleMonthSelect = (monthIndex: number) => {
    const monthString = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
    setSelectedMonth(monthString)
    onChange?.(monthString)
    setIsOpen(false)
  }

  const getCurrentMonth = () => {
    if (!selectedMonth) return -1
    const [, month] = selectedMonth.split('-')
    return parseInt(month) - 1
  }

  const popup = (
    <div ref={popoverRef} style={style} className="z-[110]">
      <div className={cn('w-72 bg-popover border border-border rounded-md shadow-lg p-3', renderAbove ? 'mb-1' : 'mt-1')}>
        <div className="flex items-center justify-between mb-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setViewYear(viewYear - 1)} className="h-7 w-7 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h4 className="font-semibold">{viewYear}</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => setViewYear(viewYear + 1)} className="h-7 w-7 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((month, index) => (
            <button key={index} type="button" className={cn('h-9 px-3 text-sm rounded-md hover:bg-accent hover:text-accent-foreground', getCurrentMonth() === index && 'bg-primary text-primary-foreground hover:bg-primary')} onClick={() => handleMonthSelect(index)}>
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} onClick={onToggle} disabled={disabled} {...props} ref={triggerRef}>
        <span className={cn('block truncate', !selectedMonth && 'text-muted-foreground')}>{selectedMonth ? formatMonth(selectedMonth) : placeholder}</span>
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </button>

      {isOpen && createPortal(popup, document.body)}

      <input type="hidden" name="month" value={selectedMonth} required={required} />
    </div>
  )
})
MonthPicker.displayName = 'MonthPicker'

export { DatePicker, MonthPicker } 