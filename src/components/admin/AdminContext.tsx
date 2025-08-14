'use client'

import React, { createContext, useContext, useState } from 'react'

interface AdminActions {
  onAddUnit?: () => void
  onAddTenant?: () => void
  onAddLease?: () => void
  onAddMaintenance?: () => void
  onAddAnnouncement?: () => void
  onAddPayment?: () => void
}

interface AdminContextType {
  actions: AdminActions
  setActions: (actions: AdminActions) => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<AdminActions>({})

  return (
    <AdminContext.Provider value={{ actions, setActions }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminActions() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdminActions must be used within an AdminProvider')
  }
  return context
}
