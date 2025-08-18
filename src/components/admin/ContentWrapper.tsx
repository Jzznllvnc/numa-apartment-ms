'use client'

import { usePathname } from 'next/navigation'
import { QuickActions } from './QuickActions'
import { useAdminActions } from './AdminContext'

// Function to generate page title based on pathname
function generatePageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 1 && segments[0] === 'admin') {
    return 'Dashboard'
  }
  
  if (segments.length >= 2 && segments[0] === 'admin') {
    const section = segments[1]
    switch (section) {
      case 'units': return 'Unit Spaces'
      case 'tenants': return 'Tenant Profiles'  
      case 'leases': return 'Lease Agreements'
      case 'payments': return 'Payment Records'
      case 'maintenance': return 'Maintenance Requests'
      case 'announcements': return 'Announcements Board'
      case 'settings': return 'Settings'
      default: return section.charAt(0).toUpperCase() + section.slice(1)
    }
  }
  
  return 'Apartment Overview'
}

interface ContentWrapperProps {
  children: React.ReactNode
}

export function ContentWrapper({ children }: ContentWrapperProps) {
  const pathname = usePathname()
  const { actions } = useAdminActions()

  const shouldShowQuickActions = pathname !== '/admin' // Don't show on dashboard
  const pageTitle = generatePageTitle(pathname)

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
        {/* Page Title */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 font-poppins">
            {pageTitle}
          </h1>
        </div>
        
        {/* Quick Actions */}
        {shouldShowQuickActions && (
          <div className="flex-shrink-0">
            <QuickActions 
              onAddUnit={actions.onAddUnit}
              onAddTenant={actions.onAddTenant}
              onAddLease={actions.onAddLease}
              onAddMaintenance={actions.onAddMaintenance}
              onAddAnnouncement={actions.onAddAnnouncement}
              onAddPayment={actions.onAddPayment}
            />
          </div>
        )}
      </div>
      {children}
    </div>
  )
} 