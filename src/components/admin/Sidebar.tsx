'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/Tooltip'
import Image from 'next/image'
import { Oleo_Script } from 'next/font/google'
import { 
  Building, 
  Users, 
  FileText, 
  DollarSign, 
  Wrench, 
  Bell, 
  LayoutDashboard, 
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { AdminHeader } from './Header'
import { AdminProvider } from './AdminContext'
import { ContentWrapper } from './ContentWrapper'
import ChatSystem from '@/components/chat/ChatSystem'

const oleo = Oleo_Script({ subsets: ['latin'], weight: '400' })

interface SidebarProps {
  className?: string
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    exact: true
  },
  {
    name: 'Units',
    href: '/admin/units',
    icon: Building
  },
  {
    name: 'Tenants',
    href: '/admin/tenants',
    icon: Users
  },
  {
    name: 'Leases',
    href: '/admin/leases',
    icon: FileText
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: DollarSign
  },
  {
    name: 'Maintenance',
    href: '/admin/maintenance',
    icon: Wrench
  },
  {
    name: 'Announcements',
    href: '/admin/announcements',
    icon: Bell
  }
]

export function Sidebar({ className }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  // Initialize collapse state once from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('adminSidebarCollapsed') : null
      if (saved === '1') setIsCollapsed(true)
    } catch {}
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try { localStorage.setItem('adminSidebarCollapsed', next ? '1' : '0') } catch {}
      }
      return next
    })
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-8 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-white dark:bg-gray-800 shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 shadow-lg transform transition-all duration-200 ease-out lg:translate-x-0 lg:static lg:inset-0 lg:h-screen",
        isCollapsed ? "w-28" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        className
      )} style={{ willChange: 'width, transform' }}>
        <div className="relative flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className={cn("flex items-center justify-between px-6 h-[96px]", isCollapsed && 'justify-center') }>
            <div className={cn("flex items-center", isCollapsed && 'justify-center w-full') }>
              <Image
                src="/ams.png"
                alt="Numa logo"
                width={1024}
                height={1024}
                className={cn(
                  isCollapsed ? 'h-14 w-14' : 'mr-3 h-14 w-14',
                )}
                priority
              />
              {!isCollapsed && (
                <h1 className={cn(oleo.className, 'text-[2.5rem] text-gray-900 dark:text-gray-100 leading-none')}>Numa</h1>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Collapse/Expand button (desktop) */}
          <button
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleCollapse}
            className={cn(
              'hidden lg:flex absolute items-center justify-center rounded-full p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow transition-all',
              isCollapsed ? '-right-3 top-[2.25rem]' : '-right-3 top-[2.25rem]'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Sidebar navigation">
            {/* Navigation title (hidden when collapsed) */}
            <div className={cn(
              'px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
              isCollapsed && 'hidden'
            )}>
              Management
            </div>
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              
              return (
                <div key={item.name} className="relative">
                  {/* Active indicator line on far left - clips at screen edge */}
                  {active && (
                    <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600"></div>
                  )}
                  
                  <Tooltip
                    content={item.name}
                    side="right"
                    delay={300}
                    disabled={!isCollapsed}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center px-3 py-2 ml-1 text-sm font-medium rounded-lg transition-colors relative w-full',
                        isCollapsed ? 'justify-center ml-1' : '',
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                      )}
                    >
                      <Icon className={cn(
                        isCollapsed ? 'h-5 w-5' : 'mr-3 h-5 w-5',
                        active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'
                      )} />
                      {!isCollapsed && <span className="flex-1">{item.name}</span>}
                    </Link>
                  </Tooltip>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      <Sidebar />
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <AdminHeader />
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <ContentWrapper>
            {children}
          </ContentWrapper>
        </div>
      </div>
      {/* Chat System */}
      <ChatSystem />
    </div>
  )
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  )
}
