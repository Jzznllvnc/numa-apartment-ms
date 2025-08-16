'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getSignedAvatarUrl, invalidateSignedAvatarUrlsForPrefix, getCachedAvatarUrl, setLastAvatarPathForUser } from '@/utils/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LayoutPanelLeft, Save, User, Shield, Database } from 'lucide-react'
import LoadingAnimation from '@/components/ui/LoadingAnimation'
import { useAlerts } from '@/components/ui/alerts'

interface AdminProfile {
  id: string
  full_name: string | null
  phone_number: string | null
  role: string
  avatar_url: string | null
}

interface ProfileFormData {
  full_name: string
  phone_number: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '',
    phone_number: ''
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalUnits: 0,
    totalLeases: 0,
    totalPayments: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('')
  const { show } = useAlerts()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)
      setProfileForm({
        full_name: profileData.full_name || '',
        phone_number: profileData.phone_number || ''
      })
      // Prepare signed URL for avatar if stored as a path (private bucket)
      if (profileData.avatar_url) {
        const cached = getCachedAvatarUrl(profileData.avatar_url)
        if (cached) setAvatarPreviewUrl(cached)
        const url = await getSignedAvatarUrl(supabase, profileData.avatar_url)
        setAvatarPreviewUrl(url)
        if (!profileData.avatar_url.startsWith('http')) setLastAvatarPathForUser(user.id, profileData.avatar_url)
      } else {
        setAvatarPreviewUrl('')
      }

      // Get system stats
      const [usersCount, unitsCount, leasesCount, paymentsCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true })
      ])

      setStats({
        totalUsers: usersCount.count || 0,
        totalUnits: unitsCount.count || 0,
        totalLeases: leasesCount.count || 0,
        totalPayments: paymentsCount.count || 0
      })

    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      const file = event.target.files?.[0]
      if (!file) return

      // Basic validation
      if (!file.type.startsWith('image/')) {
        show({ title: 'Error', description: 'Please select an image file', color: 'danger' })
        return
      }
      const maxBytes = 5 * 1024 * 1024 // 5MB
      if (file.size > maxBytes) {
        show({ title: 'Error', description: 'Image must be 5MB or smaller', color: 'danger' })
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user
      if (!user) {
        show({ title: 'Error', description: 'Not authenticated', color: 'danger' })
        return
      }

      const fileExt = file.name.split('.').pop() || 'png'
      const path = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: path, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (updateError) throw updateError

      show({ title: 'Success', description: 'Profile picture updated successfully', color: 'success' })
      // Refresh profile to reflect new avatar
      await fetchData()
      // Notify other parts of the app (e.g., header) to refresh profile data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile:updated'))
      }
      // Update preview immediately with a new signed URL and invalidate cache for this user
      invalidateSignedAvatarUrlsForPrefix(`${user.id}/`)
      const url = await getSignedAvatarUrl(supabase, path, { force: true } as any)
      setAvatarPreviewUrl(url)
      setLastAvatarPathForUser(user.id, path)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      show({ title: 'Error', description: err.message || 'Error uploading avatar', color: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!profile) {
        throw new Error('No profile data')
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileForm.full_name,
          phone_number: profileForm.phone_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      show({ title: 'Success', description: 'Profile updated successfully', color: 'success' })
      fetchData()
    } catch (err: any) {
      console.error('Error updating profile:', err)
      show({ title: 'Error', description: err.message || 'Error updating profile', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation 
          size={150} 
          message="Loading settings..." 
        />
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-8">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <User className="h-6 w-6 mr-3 text-blue-600" />
            Manage Profile
          </CardTitle>
          <CardDescription>
            Update your personal information and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                {avatarPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreviewUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-medium text-gray-600">
                    {(profile?.full_name || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-gray-800 file:text-blue-700 dark:file:text-gray-200 hover:file:bg-blue-100 dark:hover:file:bg-gray-700" />
                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Full Name</label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={profileForm.phone_number}
                  onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Role</label>
                <Input
                  value={profile?.role || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">User ID</label>
                <Input
                  value={profile?.id || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 font-mono text-xs"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* System Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <Database className="h-6 w-6 mr-3 text-blue-600" />
            System Statistics
          </CardTitle>
          <CardDescription>
            Overview of your apartment management system data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalUnits}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Units</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalLeases}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Leases</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalPayments}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Payments</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <Shield className="h-6 w-6 mr-3 text-blue-600" />
            System Information
          </CardTitle>
          <CardDescription>
            Information about your apartment management system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Application Version</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">v1.0.0</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Last Updated</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Database Status</h4>
              <p className="text-sm text-green-600 dark:text-green-400">Connected</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Authentication</h4>
              <p className="text-sm text-green-600 dark:text-green-400">Supabase Auth</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center mb-2">
            <LayoutPanelLeft className="h-6 w-6 mr-3 text-blue-600" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Configure system-wide settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send email notifications for important events</p>
              </div>
              <Button variant="outline" disabled>
                Configure
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Backup & Export</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Backup your data and export reports</p>
              </div>
              <Button variant="outline" disabled>
                Manage
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Tenant Portal</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure tenant access and permissions</p>
              </div>
              <Button variant="outline" disabled>
                Settings
              </Button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              <strong>Note:</strong> Advanced configuration options are coming in future updates.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="h-8"></div>
    </div>
  )
} 