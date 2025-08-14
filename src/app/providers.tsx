'use client'

import { AlertsProvider } from '../components/ui/alerts'

export function Providers({ children }: { children: React.ReactNode }) {
  return <AlertsProvider>{children}</AlertsProvider>
} 