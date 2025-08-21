'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getSignedAvatarUrl, getCachedAvatarUrl, getLastAvatarPathForUser, setLastAvatarPathForUser } from '@/utils/avatar'
import { ChevronDown, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import Image from 'next/image'

interface UserProfile {
  id: string
  full_name: string | null
  role: string
  avatar_url: string | null
}

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('id, full_name, role, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        const p = data as UserProfile
        setProfile(p)
        // Optimistically set from per-user cache
        const last = getLastAvatarPathForUser(user.id)
        if (last) {
          const cachedForUser = getCachedAvatarUrl(last)
          if (cachedForUser) setAvatarUrl(cachedForUser)
        }
        if (p.avatar_url) {
          const cached = getCachedAvatarUrl(p.avatar_url)
          if (cached) setAvatarUrl(cached)
          const url = await getSignedAvatarUrl(supabase, p.avatar_url)
          setAvatarUrl(url)
          if (!p.avatar_url.startsWith('http')) setLastAvatarPathForUser(user.id, p.avatar_url)
        } else {
          setAvatarUrl('')
        }
      }
    }
    loadProfile()
    const handler = () => loadProfile()
    window.addEventListener('profile:updated', handler)
    return () => window.removeEventListener('profile:updated', handler)
  }, [supabase])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-medium">
              {(profile?.full_name || 'A').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{profile?.full_name || 'Admin User'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Administrator'}</p>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <Link 
            href="/admin/settings" 
            className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => {
              setConfirmOpen(true)
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </button>
        </div>
      )}

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="" size="md" hideHeader>
        <div className="flex flex-col items-center text-center p-5">
          <Image src="/icons/logout.svg" alt="Logout" width={1024} height={1024} className="w-50 h-50 object-cover mb-5" />
          <p className="text-2xl font-bold mb-2 font-acari-sans">Are you sure you want to logout?</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">You will need to log in again to access your account.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>No, cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); setIsOpen(false); handleLogout() }} className="bg-red-600 text-white hover:bg-red-700">Yes, logout</Button>
          </div>
        </div>
      </Modal>
      
    </div>
  )
} 