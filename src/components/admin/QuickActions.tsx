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
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Add Unit</span>
      </Button>
    )
  }

  if (pathname === '/admin/tenants' && onAddTenant) {
    return (
      <Button onClick={onAddTenant} size="sm">
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Add Tenant</span>
      </Button>
    )
  }

  if (pathname === '/admin/leases' && onAddLease) {
    return (
      <Button onClick={onAddLease} size="sm">
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">New Lease</span>
      </Button>
    )
  }

  if (pathname === '/admin/maintenance' && onAddMaintenance) {
    return (
      <Button onClick={onAddMaintenance} size="sm">
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">New Request</span>
      </Button>
    )
  }

  if (pathname === '/admin/payments' && onAddPayment) {
    return (
      <Button onClick={onAddPayment} size="sm">
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Log Payment</span>
      </Button>
    )
  }

  if (pathname === '/admin/announcements' && onAddAnnouncement) {
    return (
      <Button onClick={onAddAnnouncement} size="sm">
        <Plus className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">New Announcement</span>
      </Button>
    )
  }

  return null
}
