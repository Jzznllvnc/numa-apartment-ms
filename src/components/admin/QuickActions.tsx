'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface QuickActionsProps {
  onAddUnit?: () => void
  onAddTenant?: () => void
  onAddLease?: () => void
  onAddMaintenance?: () => void
  onAddAnnouncement?: () => void
  onAddPayment?: () => void
}

export function QuickActions({ 
  onAddUnit, 
  onAddTenant, 
  onAddLease, 
  onAddMaintenance, 
  onAddAnnouncement, 
  onAddPayment
}: QuickActionsProps) {
  const pathname = usePathname()
 
  // Use shared Button default styling for consistent color in light/dark modes

  if (pathname === '/admin/units' && onAddUnit) {
    return (
      <Button onClick={onAddUnit} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Unit
      </Button>
    )
  }

  if (pathname === '/admin/tenants' && onAddTenant) {
    return (
      <Button onClick={onAddTenant} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Tenant
      </Button>
    )
  }

  if (pathname === '/admin/leases' && onAddLease) {
    return (
      <Button onClick={onAddLease} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Lease
      </Button>
    )
  }

  if (pathname === '/admin/maintenance' && onAddMaintenance) {
    return (
      <Button onClick={onAddMaintenance} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New
      </Button>
    )
  }

  if (pathname === '/admin/payments' && onAddPayment) {
    return (
      <Button onClick={onAddPayment} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Log Payment
      </Button>
    )
  }

  if (pathname === '/admin/announcements' && onAddAnnouncement) {
    return (
      <Button onClick={onAddAnnouncement} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New
      </Button>
    )
  }

  return null
}
