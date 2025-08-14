'use client'

import Link from 'next/link'
import { Bell, Sun, Moon, Search, Users, Building, FileText, DollarSign, Wrench, Megaphone, Home } from 'lucide-react'
import { ProfileDropdown } from './ProfileDropdown'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

interface SearchResult {
  id: string
  type: 'unit' | 'tenant' | 'lease' | 'payment' | 'maintenance' | 'announcement' | 'page'
  title: string
  subtitle?: string
  href: string
}

// Navigation pages data for search
const navigationPages = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Main dashboard overview',
    href: '/admin',
    keywords: ['dashboard', 'home', 'overview', 'main']
  },
  {
    id: 'units',
    title: 'Units',
    subtitle: 'Manage apartment units',
    href: '/admin/units',
    keywords: ['units', 'apartments', 'properties', 'manage units']
  },
  {
    id: 'tenants',
    title: 'Tenants',
    subtitle: 'Manage tenants and residents',
    href: '/admin/tenants',
    keywords: ['tenants', 'residents', 'people', 'manage tenants']
  },
  {
    id: 'leases',
    title: 'Leases',
    subtitle: 'Manage lease agreements',
    href: '/admin/leases',
    keywords: ['leases', 'agreements', 'contracts', 'rental agreements']
  },
  {
    id: 'payments',
    title: 'Payments',
    subtitle: 'Track rent payments',
    href: '/admin/payments',
    keywords: ['payments', 'rent', 'money', 'financial', 'billing']
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    subtitle: 'Maintenance requests and issues',
    href: '/admin/maintenance',
    keywords: ['maintenance', 'repairs', 'issues', 'requests', 'work orders']
  },
  {
    id: 'announcements',
    title: 'Announcements',
    subtitle: 'Community announcements',
    href: '/admin/announcements',
    keywords: ['announcements', 'news', 'updates', 'notifications', 'community']
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'System settings and configuration',
    href: '/admin/settings',
    keywords: ['settings', 'configuration', 'preferences', 'admin settings']
  }
]

// Theme Toggle Component
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600" />
      )}
    </button>
  )
}

// Notification Button Component
function NotificationButton() {
  const [hasNotifications, setHasNotifications] = useState(false)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Array<{ id: number | string; title: string; subtitle: string; createdAt: string }>>([])
  const [clearedAfter, setClearedAfter] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const v = localStorage.getItem('adminNotifClearedAt')
    return v ? parseInt(v, 10) : 0
  })
  const [seenAfter, setSeenAfter] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const v = localStorage.getItem('adminNotifSeenAt')
    return v ? parseInt(v, 10) : 0
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const thresholdRef = useRef<number>(0)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch of recent maintenance requests
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('id, request_details, date_submitted')
        .order('date_submitted', { ascending: false })
        .limit(5)
      if (data) {
        const mapped = data.map((r: any) => ({
          id: r.id,
          title: 'New maintenance request',
          subtitle: r.request_details,
          createdAt: r.date_submitted,
        }))
        // Filter out anything cleared previously (Clear removes from list)
        const filtered = mapped.filter((n) => new Date(n.createdAt).getTime() > clearedAfter)
        setItems(filtered)
        // Use the freshest seen timestamp (from state or localStorage) to avoid flicker
        const seenFromStorage = typeof window !== 'undefined' ? parseInt(localStorage.getItem('adminNotifSeenAt') || '0', 10) : 0
        const threshold = Math.max(clearedAfter, seenAfter, isNaN(seenFromStorage) ? 0 : seenFromStorage)
        const hasUnseen = filtered.some((n) => new Date(n.createdAt).getTime() > threshold)
        setHasNotifications(hasUnseen)
      }
    }
    fetchRecent()

    // Realtime subscription for new requests
    const channel = supabase
      .channel('maintenance-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_requests' }, (payload) => {
        const r: any = payload.new
        const newItem = {
          id: r.id,
          title: 'New maintenance request',
          subtitle: r.request_details,
          createdAt: r.date_submitted as string,
        }
        setItems((prev) => [newItem, ...prev].slice(0, 8))
        const createdMs = new Date(newItem.createdAt).getTime()
        if (createdMs > thresholdRef.current) {
          setHasNotifications(true)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clearedAfter, seenAfter])

  useEffect(() => {
    thresholdRef.current = Math.max(clearedAfter, seenAfter)
  }, [clearedAfter, seenAfter])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const toggleOpen = () => {
    if (!open) {
      // Mark all current items as seen before opening so dot hides immediately
      const now = Date.now()
      setSeenAfter(now)
      if (typeof window !== 'undefined') localStorage.setItem('adminNotifSeenAt', String(now))
      // Update threshold immediately to ignore late realtime events
      thresholdRef.current = Math.max(clearedAfter, now)
      setHasNotifications(false)
    }
    setOpen(!open)
  }

  const clearNotifications = () => {
    const now = Date.now()
    setClearedAfter(now)
    if (typeof window !== 'undefined') localStorage.setItem('adminNotifClearedAt', String(now))
    setItems([])
    setHasNotifications(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
        onClick={toggleOpen}
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium flex items-center justify-between">
            <span>Notifications</span>
            {items.length > 0 && (
              <button onClick={clearNotifications} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Clear</button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications</div>
            ) : (
              items.map((n) => (
                <a key={n.id} href="/admin/maintenance" className="flex flex-col px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{n.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.subtitle}</div>
                  <div className="text-[11px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Search Bar Component
function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchResults])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) {
      if (e.key === 'ArrowDown' && searchQuery.trim()) {
        setShowResults(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selectedResult = searchResults[selectedIndex]
          window.location.href = selectedResult.href
          setShowResults(false)
          setSelectedIndex(-1)
        } else if (searchResults.length > 0) {
          // Navigate to first result if no selection
          window.location.href = searchResults[0].href
          setShowResults(false)
          setSelectedIndex(-1)
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(true)

    try {
      const results: SearchResult[] = []
      const queryLower = query.toLowerCase().trim()

      // 1. Search navigation pages (client-side, fastest)
      const pageResults = navigationPages
        .filter(page => {
          const titleMatch = page.title.toLowerCase().includes(queryLower)
          const keywordMatch = page.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
          return titleMatch || keywordMatch
        })
        .slice(0, 3)
        .map(page => ({
          id: page.id,
          type: 'page' as const,
          title: page.title,
          subtitle: page.subtitle,
          href: page.href
        }))

      results.push(...pageResults)

      // 2. Search database concurrently for better performance
      const supabase = createClient()
      
      const [unitsResponse, tenantsResponse] = await Promise.all([
        // Search units by unit number
        supabase
          .from('units')
          .select('id, unit_number, rent_amount, floor, bedrooms, bathrooms')
          .ilike('unit_number', `%${query}%`)
          .limit(5),
        
        // Search tenants by name and email
        supabase
          .from('users')
          .select('id, full_name, email, phone_number')
          .eq('role', 'tenant')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)
      ])

      // Process units
      if (unitsResponse.data) {
        const unitResults = unitsResponse.data.map(unit => ({
          id: unit.id,
          type: 'unit' as const,
          title: `Unit ${unit.unit_number}`,
          subtitle: `${unit.bedrooms}BR/${unit.bathrooms}BA • Floor ${unit.floor} • $${unit.rent_amount?.toLocaleString()}/mo`,
          href: `/admin/units?highlight=${unit.id}`
        }))
        results.push(...unitResults)
      }

      // Process tenants
      if (tenantsResponse.data) {
        const tenantResults = tenantsResponse.data.map(tenant => ({
          id: tenant.id,
          type: 'tenant' as const,
          title: tenant.full_name || 'Unnamed Tenant',
          subtitle: `${tenant.email}${tenant.phone_number ? ` • ${tenant.phone_number}` : ''}`,
          href: `/admin/tenants?highlight=${tenant.id}`
        }))
        results.push(...tenantResults)
      }

      // Sort results: pages first, then units, then tenants
      const sortedResults = results.sort((a, b) => {
        const typeOrder: Record<string, number> = { 
          page: 0, 
          unit: 1, 
          tenant: 2, 
          lease: 3, 
          payment: 4, 
          maintenance: 5, 
          announcement: 6 
        }
        return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99)
      })

      setSearchResults(sortedResults.slice(0, 8)) // Limit total results
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigation is now handled by handleKeyDown
  }

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'page': return <Home className="h-4 w-4" />
      case 'unit': return <Building className="h-4 w-4" />
      case 'tenant': return <Users className="h-4 w-4" />
      case 'lease': return <FileText className="h-4 w-4" />
      case 'payment': return <DollarSign className="h-4 w-4" />
      case 'maintenance': return <Wrench className="h-4 w-4" />
      case 'announcement': return <Megaphone className="h-4 w-4" />
    }
  }

  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, units, tenants..."
            className="pl-10 pr-4 py-2 w-80 lg:w-96 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-200"
          />
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto z-50">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  onClick={() => {
                    setShowResults(false)
                    setSelectedIndex(-1)
                  }}
                  className={`flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedIndex === index ? 'bg-blue-100 dark:bg-blue-900' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-3 text-gray-400 dark:text-gray-500">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                      {result.type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found for &quot;{searchQuery}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function AdminHeader() {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 lg:px-8 h-[72px] flex items-center shadow-sm dark:bg-gray-900/95 dark:border-gray-700">
      <div className="flex items-center justify-between w-full">
        {/* Left side - Search Bar */}
        <div className="flex-shrink-0">
          <SearchBar />
        </div>

        {/* Right side - Settings, Theme, Notifications, Profile */}
        <div className="flex items-center space-x-3">
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationButton />
          
          {/* Profile Dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </div>
  )
}