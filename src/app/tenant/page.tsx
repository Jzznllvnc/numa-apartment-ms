'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { getSignedAvatarUrl, invalidateSignedAvatarUrlsForPrefix, getCachedAvatarUrl, getLastAvatarPathForUser, setLastAvatarPathForUser } from '@/utils/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Home, CreditCard, Wrench, Bell, Sun, Moon, User as UserIcon, LogOut, Plus, ArrowLeft } from 'lucide-react'
import { User, Lease, Payment, MaintenanceRequest, Announcement } from '@/types/database'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useAlerts } from '@/components/ui/alerts'
import { Oleo_Script } from 'next/font/google'

const oleo = Oleo_Script({ subsets: ['latin'], weight: '400' })

// Hoisted components to keep stable identity and avoid state resets
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
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
    <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors" title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
      {isDark ? <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" /> : <Moon className="h-5 w-5 text-gray-600" />}
    </button>
  )
}

function NotificationButton() {
  const supabase = createClient()
  const [hasNotifications, setHasNotifications] = useState(false)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Array<{ id: number | string; title: string; subtitle: string; createdAt: string; type: 'unit' | 'announcement' }>>([])
  const [clearedAfter, setClearedAfter] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const v = localStorage.getItem('tenantNotifClearedAt')
    return v ? parseInt(v, 10) : 0
  })
  const [seenAfter, setSeenAfter] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    const v = localStorage.getItem('tenantNotifSeenAt')
    return v ? parseInt(v, 10) : 0
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const thresholdRef = useRef<number>(0)

  useEffect(() => {
    thresholdRef.current = Math.max(clearedAfter, seenAfter)
  }, [clearedAfter, seenAfter])

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const { data: announcements } = await supabase
          .from('announcements')
          .select('id, title, content, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        const { data: units } = await supabase
          .from('units')
          .select('id, unit_number, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        const notificationItems: Array<{ id: string; title: string; subtitle: string; createdAt: string; type: 'unit' | 'announcement' }> = []
        if (announcements) {
          notificationItems.push(
            ...announcements.map((a: any) => ({
              id: `announcement-${a.id}`,
              title: 'New Announcement',
              subtitle: a.title,
              createdAt: a.created_at,
              type: 'announcement' as const,
            }))
          )
        }
        if (units) {
          notificationItems.push(
            ...units.map((u: any) => ({
              id: `unit-${u.id}`,
              title: 'New Unit Available',
              subtitle: `Unit ${u.unit_number} has been added`,
              createdAt: u.created_at,
              type: 'unit' as const,
            }))
          )
        }

        const sortedItems = notificationItems
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .filter((n) => new Date(n.createdAt).getTime() > clearedAfter)
          .slice(0, 8)

        setItems(sortedItems)

        const seenFromStorage = typeof window !== 'undefined' ? parseInt(localStorage.getItem('tenantNotifSeenAt') || '0', 10) : 0
        const threshold = Math.max(clearedAfter, seenAfter, isNaN(seenFromStorage) ? 0 : seenFromStorage)
        const hasUnseen = sortedItems.some((n) => new Date(n.createdAt).getTime() > threshold)
        setHasNotifications(hasUnseen)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }
    fetchRecent()

    const announcementChannel = supabase
      .channel('tenant-announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const a: any = payload.new
        const newItem = {
          id: `announcement-${a.id}`,
          title: 'New Announcement',
          subtitle: a.title,
          createdAt: a.created_at as string,
          type: 'announcement' as const,
        }
        setItems((prev) => [newItem, ...prev].slice(0, 8))
        const createdMs = new Date(newItem.createdAt).getTime()
        if (createdMs > thresholdRef.current) setHasNotifications(true)
      })
      .subscribe()

    const unitChannel = supabase
      .channel('tenant-units')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'units' }, (payload) => {
        const u: any = payload.new
        const newItem = {
          id: `unit-${u.id}`,
          title: 'New Unit Available',
          subtitle: `Unit ${u.unit_number} has been added`,
          createdAt: u.created_at as string,
          type: 'unit' as const,
        }
        setItems((prev) => [newItem, ...prev].slice(0, 8))
        const createdMs = new Date(newItem.createdAt).getTime()
        if (createdMs > thresholdRef.current) setHasNotifications(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(announcementChannel)
      supabase.removeChannel(unitChannel)
    }
  }, [clearedAfter, seenAfter])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)
    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true } as any)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const toggleOpen = () => {
    setOpen(!open)
    if (!open) {
      const now = Date.now()
      setSeenAfter(now)
      localStorage.setItem('tenantNotifSeenAt', now.toString())
      setHasNotifications(false)
    }
  }

  const clearNotifications = () => {
    const now = Date.now()
    setClearedAfter(now)
    localStorage.setItem('tenantNotifClearedAt', now.toString())
    setItems([])
    setHasNotifications(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors" title="Notifications" onClick={toggleOpen}>
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {hasNotifications && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>}
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
                <div key={n.id} className="flex flex-col px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{n.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.subtitle}</div>
                  <div className="text-[11px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileDropdown({ onManageProfile, onLogout }: { onManageProfile: () => void; onLogout: () => void }) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setFullName(data.full_name || '')
        const last = getLastAvatarPathForUser(user.id)
        if (last) {
          const cachedForUser = getCachedAvatarUrl(last)
          if (cachedForUser) setAvatarUrl(cachedForUser)
        }
        if (data.avatar_url) {
          const cached = getCachedAvatarUrl(data.avatar_url)
          if (cached) setAvatarUrl(cached)
          const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(data.avatar_url, 60)
          setAvatarUrl(signed?.signedUrl || '')
          setLastAvatarPathForUser(user.id, data.avatar_url)
        }
      }
    }
    load()
    const handler = () => load()
    window.addEventListener('profile:updated', handler)
    return () => window.removeEventListener('profile:updated', handler)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-3 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-medium">{(fullName || 'U').charAt(0).toUpperCase()}</span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <a href="#" onClick={(e) => { e.preventDefault(); setIsOpen(false); onManageProfile() }} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <UserIcon className="mr-3 h-4 w-4" />
            Manage Profile
          </a>
          <button onClick={onLogout} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

function ProfileEditor({ user, onBack, refreshParent }: { user: User | null; onBack: () => void; refreshParent: () => void }) {
  const supabase = createClient()
  const { show } = useAlerts()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '')
  const [avatarUrl, setAvatarUrl] = useState(() => {
    if (!user?.id) return ''
    const last = getLastAvatarPathForUser(user.id)
    return last ? getCachedAvatarUrl(last) : ''
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const init = async () => {
      if (!user) return
      setFullName(user.full_name || '')
      setPhoneNumber(user.phone_number || '')
      setAvatarUrl(user.avatar_url ? await getSignedAvatarUrl(supabase, user.avatar_url) : '')
    }
    init()
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName, phone_number: phoneNumber, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error
      show({ title: 'Success', description: 'Profile updated successfully', color: 'success' })
      refreshParent()
    } catch (err: any) {
      show({ title: 'Error', description: err.message, color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith('image/')) throw new Error('Please select an image file')
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) throw new Error('Image must be 5MB or smaller')
      const { data: auth } = await supabase.auth.getUser()
      const authUser = auth.user
      if (!authUser) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop() || 'png'
      const path = `${authUser.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { error: updErr } = await supabase.from('users').update({ avatar_url: path, updated_at: new Date().toISOString() }).eq('id', authUser.id)
      if (updErr) throw updErr
      invalidateSignedAvatarUrlsForPrefix(`${authUser.id}/`)
      const newUrl = await getSignedAvatarUrl(supabase, path, { force: true } as any)
      setAvatarUrl(newUrl)
      show({ title: 'Success', description: 'Profile picture updated successfully', color: 'success' })
      window.dispatchEvent(new CustomEvent('profile:updated'))
      if (fileRef.current) fileRef.current.value = ''
      refreshParent()
    } catch (err: any) {
      show({ title: 'Error', description: err.message, color: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <UserIcon className="h-6 w-6 text-blue-600 mr-3" />
              Manage Profile
            </CardTitle>
            {/* Back button for desktop - hidden on mobile */}
            <Button variant="outline" onClick={onBack} className="hidden md:inline-flex">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <CardDescription>Update your personal information and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-gray-600">{(user?.full_name || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-gray-800 file:text-blue-700 dark:file:text-gray-200 hover:file:bg-blue-100 dark:hover:file:bg-gray-700" />
              {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="bg-blue-600 text-white hover:bg-blue-700">
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface TenantData {
  user: User | null
  lease: Lease | null
  payments: Payment[]
  maintenanceRequests: MaintenanceRequest[]
  announcements: Announcement[]
}

export default function TenantDashboard() {
  const [data, setData] = useState<TenantData>({
    user: null,
    lease: null,
    payments: [],
    maintenanceRequests: [],
    announcements: [],
  })
  const [loading, setLoading] = useState(true)
  const [unitImageUrl, setUnitImageUrl] = useState<string>('/placeholder-unit.svg')
  const [showImageModal, setShowImageModal] = useState(false)
  const supabase = createClient()
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestDetails, setRequestDetails] = useState('')
  const [requestFile, setRequestFile] = useState<File | null>(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const { show } = useAlerts()

  // Helper function to get signed unit image URL
  const getSignedUnitImageUrl = async (imagePath: string): Promise<string> => {
    if (!imagePath) return '/placeholder-unit.svg'
    
    try {
      const { data, error } = await supabase.storage
        .from('units')
        .createSignedUrl(imagePath, 3600) // 1 hour expiry
      
      if (error) throw error
      return data.signedUrl
    } catch (err) {
      console.error('Error getting signed URL:', err)
      return '/placeholder-unit.svg'
    }
  }

  useEffect(() => {
    fetchTenantData()
  }, [])

  const fetchTenantData = async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      // Get active lease
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          unit:units(id, unit_number, floor, bedrooms, bathrooms, size_sqft, rent_amount, image_url)
        `)
        .eq('tenant_id', authUser.id)
        .eq('is_active', true)
        .single()

      if (leaseError && leaseError.code !== 'PGRST116') throw leaseError

      // Get payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', authUser.id)
        .order('payment_date', { ascending: false })
        .limit(5)

      if (paymentsError) throw paymentsError

      // Get maintenance requests
      const { data: maintenanceRequests, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', authUser.id)
        .order('date_submitted', { ascending: false })
        .limit(5)

      if (maintenanceError) throw maintenanceError

      // Get recent announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      if (announcementsError) throw announcementsError

      setData({
        user: userProfile,
        lease: lease || null,
        payments: payments || [],
        maintenanceRequests: maintenanceRequests || [],
        announcements: announcements || [],
      })

      // Load unit image if available
      if (lease?.unit?.image_url) {
        const imageUrl = await getSignedUnitImageUrl(lease.unit.image_url)
        setUnitImageUrl(imageUrl)
      } else {
        setUnitImageUrl('/placeholder-unit.svg')
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(true)
  }
  const confirmLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestError('')
    if (!requestDetails.trim()) {
      setRequestError('Please describe the issue')
      return
    }

    try {
      setSubmittingRequest(true)
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user) throw new Error('Not authenticated')
      if (!data.lease) throw new Error('No active lease found')

      let imagePath: string | null = null
      if (requestFile) {
        if (!requestFile.type.startsWith('image/')) throw new Error('Attached file must be an image')
        if (requestFile.size > 5 * 1024 * 1024) throw new Error('Image must be 5MB or smaller')
        const fileExt = requestFile.name.split('.').pop() || 'jpg'
        const storagePath = `${user.id}/${Date.now()}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('maintenance')
          .upload(storagePath, requestFile, { cacheControl: '3600', upsert: true, contentType: requestFile.type })
        if (uploadErr) {
          console.warn('Image upload failed:', uploadErr.message)
        } else {
          imagePath = storagePath
        }
      }

      const { error: insertErr } = await supabase
        .from('maintenance_requests')
        .insert([
          {
            unit_id: data.lease.unit_id,
            tenant_id: user.id,
            request_details: requestDetails.trim(),
            status: 'pending',
            image_url: imagePath,
            notes: null,
          },
        ])
        .select('id')

      if (insertErr) throw insertErr

      setRequestSuccess('Request submitted!')
      show({ title: 'Request submitted', description: 'Your maintenance request has been sent.', color: 'success' })
      setShowRequestModal(false)
      setRequestDetails('')
      setRequestFile(null)
      fetchTenantData()
    } catch (err: any) {
      console.error('Submit maintenance error:', err)
      setRequestError(err.message || 'Failed to submit request')
    } finally {
      setSubmittingRequest(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Image src="/ams.png" alt="Logo" width={1024} height={1024} className="h-14 w-14 mr-3" />
              <div>
                <h1 className={`text-4xl text-gray-900 dark:text-gray-100 leading-none ${oleo.className}`}>
                  Numa
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <NotificationButton />
              <ProfileDropdown onManageProfile={() => setView('profile')} onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span>Portal</span>
              <span className="mx-2">&gt;</span>
              <span style={{ fontWeight: 'bold' }}>
                {view === 'dashboard' ? 'Dashboard' : 'Manage Profile'}
              </span>
            </div>
            {/* Back button for mobile - show only on profile view */}
            {view === 'profile' && (
              <Button variant="outline" onClick={() => setView('dashboard')} className="md:hidden">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>

        {view === 'dashboard' ? (
          <>
            {/* Greeting - Only show on dashboard */}
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 font-poppins">
                Welcome, {data.user?.full_name ? data.user.full_name.split(' ').slice(0, 2).join(' ') : 'Guest'}
              </h1>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-300 mb-6">Current Unit</div>
                    <div className="mt-3 flex items-baseline gap-3">
                      <div className="text-3xl font-semibold leading-none">
                        {data.lease?.unit?.unit_number || 'Not Assigned'}
                      </div>
                    </div>
                    {data.lease?.unit && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Floor {data.lease.unit.floor} &nbsp;|&nbsp; {data.lease.unit.bedrooms} bed, {data.lease.unit.bathrooms} bath
                      </div>
                    )}
                  </div>
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 relative group">
                    <Image 
                      src={unitImageUrl} 
                      alt={`Unit ${data.lease?.unit?.unit_number || ''}`} 
                      width={5274} 
                      height={3517} 
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                      onError={() => setUnitImageUrl('/placeholder-unit.svg')}
                      onClick={() => setShowImageModal(true)}
                    />
                    {/* Hover Preview - Only visible on desktop */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 hidden md:block">
                      <div className="absolute top-0 right-0 transform translate-x-full -translate-y-4 w-80 h-60 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-200 dark:border-gray-600 overflow-hidden">
                        <Image 
                          src={unitImageUrl} 
                          alt={`Unit ${data.lease?.unit?.unit_number || ''} - Full Preview`} 
                          width={5274} 
                          height={3517} 
                          className="w-full h-full object-cover"
                          onError={() => setUnitImageUrl('/placeholder-unit.svg')}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2">
                          <p className="text-xs font-medium">Unit {data.lease?.unit?.unit_number || ''}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-300">Monthly Rent</div>
                  <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <div className="text-3xl font-semibold leading-none">
                    ${data.lease?.unit?.rent_amount?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Due on the 1st of each month
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-300">Maintenance Requests</div>
                  <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <div className="text-3xl font-semibold leading-none">{data.maintenanceRequests.length}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Recent requests submitted
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lease Information */}
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Lease Information</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Your current lease details</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.lease ? (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Lease Start:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{new Date(data.lease.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Lease End:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{new Date(data.lease.end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Security Deposit:</span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">${data.lease.security_deposit?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Status:</span>
                        <span className="text-sm">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No active lease found</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Payment History</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Your recent rent payments</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.payments.length > 0 ? (
                    <div className="space-y-4">
                      {data.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {new Date(payment.payment_for_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Paid on {new Date(payment.payment_date).toLocaleDateString()}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">${payment.amount_paid.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No payment history found</p>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance Requests */}
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900 dark:text-gray-100">Maintenance Requests</CardTitle>
                      <CardDescription className="text-gray-500 dark:text-gray-400">Your recent maintenance requests</CardDescription>
                    </div>
                    <Button onClick={() => setShowRequestModal(true)} size="sm"><Plus className="h-4 w-4 mr-2" />Submit Request</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.maintenanceRequests.length > 0 ? (
                    <div className="space-y-4">
                      {data.maintenanceRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{request.request_details}</p>
                            <span className={`${'px-2 py-1 rounded-full text-xs '} ${
                              request.status === 'completed' ? 'bg-green-100 text-green-800' :
                              request.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Submitted {new Date(request.date_submitted).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No maintenance requests yet</p>
                      <p className="text-xs text-gray-400">Click &quot;Submit Request&quot; above to create your first maintenance request</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Announcements */}
              <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-900 dark:text-gray-100">Announcements</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">Latest updates from management</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.announcements.length > 0 ? (
                    <div className="space-y-4">
                      {data.announcements.map((announcement) => (
                        <div key={announcement.id} className="border rounded-lg p-3">
                          <h4 className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">{announcement.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{announcement.content}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(announcement.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No announcements at this time</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <ProfileEditor user={data.user} onBack={() => setView('dashboard')} refreshParent={fetchTenantData} />
        )}
      </div>

      {/* Maintenance Request Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title={
          <span className="flex items-center">
            <Wrench className="h-6 w-6 mr-3 text-blue-600" />
            Submit New Maintenance Request
          </span>
        }
      >
        <form onSubmit={handleSubmitMaintenance} className="space-y-4">
          <div>
            <label htmlFor="request-details" className="block text-sm font-medium mb-1">Request Details</label>
            <Textarea id="request-details" value={requestDetails} onChange={(e) => setRequestDetails(e.target.value)} rows={4} placeholder="Describe the issue (e.g., leaky faucet, broken light, etc.)" required />
          </div>
          <div>
            <label htmlFor="request-file" className="block text-sm font-medium mb-1">Attach Photo (Optional)</label>
            <input type="file" id="request-file" accept="image/*" onChange={(e) => setRequestFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-gray-800 file:text-blue-700 dark:file:text-gray-200 hover:file:bg-blue-100 dark:hover:file:bg-gray-700" />
            {requestFile && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selected file: {requestFile.name}</p>}
          </div>
          {requestError && <p className="text-sm text-red-600 dark:text-red-400">{requestError}</p>}
          {requestSuccess && <p className="text-sm text-green-600 dark:text-green-400">{requestSuccess}</p>}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingRequest}>{submittingRequest ? 'Submitting...' : 'Submit Request'}</Button>
          </div>
        </form>
      </Modal>

      {/* Unit Image Modal */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={`Unit ${data.lease?.unit?.unit_number || ''} Image`}
        size="xl"
      >
        <div className="flex flex-col items-center dark:bg-[#111827]">
          <div className="w-full max-w-4xl max-h-[70vh] overflow-hidden rounded-lg">
            <Image 
              src={unitImageUrl} 
              alt={`Unit ${data.lease?.unit?.unit_number || ''} - Full Size`} 
              width={5274} 
              height={3517} 
              className="w-full h-full object-contain"
              onError={() => setUnitImageUrl('/placeholder-unit.svg')}
            />
          </div>
          {data.lease?.unit && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Unit {data.lease.unit.unit_number}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Floor {data.lease.unit.floor} &nbsp;|&nbsp; {data.lease.unit.bedrooms} bed, {data.lease.unit.bathrooms} bath &nbsp;|&nbsp; {data.lease.unit.size_sqft} sq ft
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Logout confirmation */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title=""
        size="md"
        hideHeader
      >
        <div className="flex flex-col items-center text-center p-4">
          <Image src="/logout.png" alt="Logout" width={1024} height={1024} className="w-80 h-80 object-contain mb-5" />
          <p className="text-xl font-semibold mb-2">Are you sure you want to logout?</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">You will need to log in again to access your account.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>No, cancel</Button>
            <Button onClick={confirmLogout} className="bg-red-600 text-white hover:bg-red-700">Yes, logout</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
