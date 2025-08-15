'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Users, Edit, Trash2, Plus, Mail, Phone, UserPlus, EllipsisVertical } from 'lucide-react'
import { useAdminActions } from '@/components/admin/AdminContext'
import { useAlerts } from '@/components/ui/alerts'
import { getSignedAvatarUrl, getCachedAvatarUrl } from '@/utils/avatar'
import PasswordInputUI from '@/components/PasswordInputUI'

interface Tenant {
  id: string
  full_name: string | null
  email: string
  phone_number: string | null
  role: string
  created_at: string
  updated_at: string
  avatar_url?: string | null
}

interface TenantFormData {
  full_name: string
  email: string
  phone_number: string
  password?: string
}

export default function TenantsManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState<TenantFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    password: ''
  })
  const [error, setError] = useState('')
  const supabase = createClient()
  const { setActions } = useAdminActions()
  const { show } = useAlerts()

  const handleAddTenant = () => {
    setEditingTenant(null)
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      password: ''
    })
    setShowFormModal(true)
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    setActions({ onAddTenant: handleAddTenant })
  }, [setActions])

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/tenants/list', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch tenants')

      const base = (json.tenants as Tenant[]) || []

      // Sign avatar URLs when needed and reuse cache when already full URLs
      const enhanced = await Promise.all(base.map(async (t) => {
        if (t.avatar_url && !t.avatar_url.startsWith('http')) {
          try {
            const cached = getCachedAvatarUrl(t.avatar_url)
            if (cached) return { ...t, avatar_url: cached }
            const signed = await getSignedAvatarUrl(supabase, t.avatar_url)
            return { ...t, avatar_url: signed }
          } catch {
            return t
          }
        }
        return t
      }))

      setTenants(enhanced)
    } catch (err: any) {
      console.error('Error fetching tenants:', err)
      setError(err.message || 'Error fetching tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (editingTenant) {
        // Update existing tenant profile only
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTenant.id)

        if (error) throw error
        show({ title: 'Tenant updated', description: 'The tenant profile has been updated successfully.', color: 'success' })
      } else {
        const res = await fetch('/api/tenants/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password || 'temppassword123',
            full_name: formData.full_name,
            phone_number: formData.phone_number
          })
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to create tenant')
        show({ title: 'Tenant created', description: 'New tenant account has been created.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingTenant(null)
      fetchTenants()
    } catch (err: any) {
      setError(err.message || 'Error saving tenant')
      show({ title: 'Error', description: err.message || 'Failed to save tenant', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setFormData({
      full_name: tenant.full_name || '',
      email: tenant.email,
      phone_number: tenant.phone_number || '',
      password: ''
    })
    setShowFormModal(true)
  }

  const handleDeleteClick = (tenant: Tenant) => {
    setDeletingTenant(tenant)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingTenant) return

    try {
      const res = await fetch('/api/tenants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deletingTenant.id })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete tenant')

      setShowDeleteModal(false)
      setDeletingTenant(null)
      fetchTenants()
      show({ title: 'Tenant deleted', description: 'The tenant account has been removed.', color: 'success' })
    } catch (err: any) {
      setError(err.message || 'Error deleting tenant')
      show({ title: 'Error', description: err.message || 'Failed to delete tenant', color: 'danger' })
    }
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingTenant(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading tenants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Tenants Grid - portrait cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow rounded-xl">
            <CardHeader className="pt-4 pb-0">
              <div className="flex items-start justify-end">
                <ActionMenu onEdit={() => handleEdit(tenant)} onDelete={() => handleDeleteClick(tenant)} />
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                  {tenant.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tenant.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 font-medium text-3xl">{(tenant.full_name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <CardTitle className="mt-4 text-2xl">{tenant.full_name || 'Unnamed Tenant'}</CardTitle>
                <CardDescription className="mt-1">Joined {new Date(tenant.created_at).toLocaleDateString()}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{tenant.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{tenant.phone_number || 'No phone'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Tenants Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Start by adding your first tenant to the system.</p>
            <Button 
              onClick={handleAddTenant}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Tenant Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingTenant ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <UserPlus className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
          </span>
        }
        description={editingTenant ? 'Update tenant information' : 'Enter details for the new tenant'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Full Name
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                disabled={!!editingTenant}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            {!editingTenant && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <PasswordInputUI
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter temporary password"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
            >
              {saving ? 'Saving...' : (editingTenant ? 'Update Tenant' : 'Add Tenant')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tenant"
        message={`Are you sure you want to delete tenant ${deletingTenant?.full_name}? This will also remove their account and cannot be undone.`}
        confirmText="Delete Tenant"
        confirmVariant="destructive"
      />

      <div className="h-8"></div>
    </div>
  )
}

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <EllipsisVertical className="h-5 w-5 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-40">
          <button onClick={() => { setOpen(false); onEdit() }} className="flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
          <button onClick={() => { setOpen(false); onDelete() }} className="flex w-full items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </button>
        </div>
      )}
    </div>
  )
} 