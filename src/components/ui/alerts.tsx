"use client"

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Info, Check, AlertTriangle, CircleAlert, X } from 'lucide-react'

export type AlertColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

export interface AppAlert {
	id: string
	title?: ReactNode
	description?: ReactNode
	color?: AlertColor
	durationMs?: number
	isClosable?: boolean
	onUndo?: () => void
	undoText?: string
}

interface AlertsContextValue {
	show: (alert: Omit<AppAlert, 'id'>) => void
	remove: (id: string) => void
}

const AlertsContext = createContext<AlertsContextValue | null>(null)

const iconByColor: Record<NonNullable<AppAlert['color']>, ReactNode> = {
	default: <Info className="h-5 w-5" />,
	primary: <Info className="h-5 w-5" />,
	secondary: <CircleAlert className="h-5 w-5" />,
	success: <Check className="h-5 w-5" />,
	warning: <AlertTriangle className="h-5 w-5" />,
	danger: <CircleAlert className="h-5 w-5" />,
}

const iconBgByColor: Record<NonNullable<AppAlert['color']>, string> = {
	default: 'bg-gray-700 text-white',
	primary: 'bg-blue-600 text-white',
	secondary: 'bg-purple-600 text-white',
	success: 'bg-green-600 text-white',
	warning: 'bg-yellow-600 text-white',
	danger: 'bg-red-600 text-white',
}

export function AlertsProvider({ children }: { children: ReactNode }) {
	const [alerts, setAlerts] = useState<AppAlert[]>([])

	const remove = useCallback((id: string) => {
		setAlerts((prev) => prev.filter((a) => a.id !== id))
	}, [])

	const show = useCallback(
		(alert: Omit<AppAlert, 'id'>) => {
			const id = Math.random().toString(36).slice(2)
			const a: AppAlert = { id, isClosable: true, durationMs: 4000, color: 'success', undoText: 'Undo', ...alert }
			// Add new alerts to the beginning of the array so they appear on top
			setAlerts((prev) => [a, ...prev])

			if (a.durationMs && a.durationMs > 0) {
				setTimeout(() => remove(id), a.durationMs)
			}
		},
		[remove]
	)

	const value = useMemo(() => ({ show, remove }), [show, remove])

	return (
		<AlertsContext.Provider value={value}>
			{children}
			{/* Top-center toast region */}
			<div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center pointer-events-none">
				{alerts.map((a, idx) => (
					<div
						key={a.id}
						role="alert"
						className={`relative pointer-events-auto rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg px-5 py-4 transition-all duration-300 ease-out animate-in slide-in-from-top-2 ${
							idx > 0 ? '-mt-16' : ''
						}`}
						style={{ 
							zIndex: 100 - idx,
							width: `min(${92 - idx * 2}vw, ${560 - idx * 20}px)`,
							transform: `translateY(${idx * 2}px) scale(${1 - idx * 0.05})`,
						}}
					>
						<div className="flex items-center gap-4">
							<span
								className={`inline-flex h-8 w-8 mr-2 items-center justify-center rounded-full flex-none shrink-0 shadow-sm ${iconBgByColor[a.color || 'default']}`}
								aria-hidden
							>
								{iconByColor[a.color || 'default']}
							</span>
							<div className="min-w-0 flex-1">
								{a.title && <div className="text-base font-semibold leading-none mb-1">{a.title}</div>}
								{a.description && <div className="text-sm text-gray-600 dark:text-gray-300">{a.description}</div>}
							</div>
							{a.onUndo && (
								<button
									onClick={() => {
										a.onUndo?.()
										remove(a.id)
									}}
									className="ml-2 text-sm font-medium text-gray-900 dark:text-white hover:underline"
								>
									{a.undoText || 'Undo'}
								</button>
							)}
							{a.isClosable && (
								<button 
									onClick={() => remove(a.id)} 
									className="ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors opacity-60 hover:opacity-100"
									aria-label="Close notification"
								>
									<X className="h-5 w-5" />
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		</AlertsContext.Provider>
	)
}

export function useAlerts() {
	const ctx = useContext(AlertsContext)
	if (!ctx) throw new Error('useAlerts must be used inside AlertsProvider')
	return ctx
} 