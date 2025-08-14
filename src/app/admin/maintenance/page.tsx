'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { Wrench, Edit, Trash2, Plus, Calendar, User, Building, AlertCircle, CheckCircle, Hammer } from 'lucide-react'
import { useAdminActions } from '@/components/admin/AdminContext'
import { useAlerts } from '@/components/ui/alerts'

interface MaintenanceRequest {
  id: number
  unit_id: number
  tenant_id: string
  request_details: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  image_url: string | null
  date_submitted: string
  date_completed: string | null
  notes: string | null
  units: {
    unit_number: string
  }
  users: {
    full_name: string
  }
}

interface MaintenanceFormData {
  unit_id: string
  tenant_id: string
  request_details: string
  status: string
  notes: string
}

interface Unit {
  id: number
  unit_number: string
}

interface Tenant {
  id: string
  full_name: string
}

export default function MaintenanceManagement() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<MaintenanceRequest | null>(null)
  const [formData, setFormData] = useState<MaintenanceFormData>({
    unit_id: '',
    tenant_id: '',
    request_details: '',
    status: 'pending',
    notes: ''
  })
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0
  })
  const supabase = createClient()
  const { setActions } = useAdminActions()
  const { show } = useAlerts()

  const handleAddMaintenance = () => {
    setEditingRequest(null)
    setFormData({
      unit_id: '',
      tenant_id: '',
      request_details: '',
      status: 'pending',
      notes: ''
    })
    setShowFormModal(true)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setActions({ onAddMaintenance: handleAddMaintenance })
  }, [setActions])

  const fetchData = async () => {
    try {
      // Fetch maintenance requests with unit and tenant info
      const { data: requestsData, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units (unit_number),
          users (full_name)
        `)
        .order('date_submitted', { ascending: false })

      if (requestsError) throw requestsError

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number')
        .order('unit_number')

      if (unitsError) throw unitsError

      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'tenant')
        .order('full_name')

      if (tenantsError) throw tenantsError

      // Sign image URLs for display if stored as bucket paths
      const withSignedImages = await Promise.all((requestsData || []).map(async (r: any) => {
        if (r.image_url && typeof r.image_url === 'string' && !r.image_url.startsWith('http')) {
          try {
            const { data: signed } = await supabase.storage
              .from('maintenance')
              .createSignedUrl(r.image_url, 300)
            return { ...r, image_url: signed?.signedUrl || r.image_url }
          } catch {
            return r
          }
        }
        return r
      }))

      setRequests(withSignedImages || [])
      setUnits(unitsData || [])
      setTenants(tenantsData || [])

      // Calculate stats
      const pending = withSignedImages?.filter((req: any) => req.status === 'pending').length || 0
      const inProgress = withSignedImages?.filter((req: any) => req.status === 'in_progress').length || 0
      const completed = withSignedImages?.filter((req: any) => req.status === 'completed').length || 0

      setStats({ pending, inProgress, completed })

    } catch (err) {
      console.error('Error fetching data:', err)
      show({ title: 'Error', description: 'Error fetching data', color: 'danger' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const requestData = {
        unit_id: parseInt(formData.unit_id),
        tenant_id: formData.tenant_id,
        request_details: formData.request_details,
        status: formData.status,
        notes: formData.notes || null,
        date_completed: formData.status === 'completed' ? new Date().toISOString() : null
      }

      if (editingRequest) {
        // Update existing request
        const { error } = await supabase
          .from('maintenance_requests')
          .update(requestData)
          .eq('id', editingRequest.id)

        if (error) throw error

        // Update unit status if needed
        if (formData.status === 'in_progress') {
          await supabase
            .from('units')
            .update({ status: 'under_maintenance' })
            .eq('id', parseInt(formData.unit_id))
        } else if (formData.status === 'completed') {
          await supabase
            .from('units')
            .update({ status: 'occupied' })
            .eq('id', parseInt(formData.unit_id))
        }
        show({ title: 'Request updated', description: 'Maintenance request has been updated.', color: 'success' })
      } else {
        // Create new request
        const { error } = await supabase
          .from('maintenance_requests')
          .insert([requestData])

        if (error) throw error
        show({ title: 'Request created', description: 'A new maintenance request has been created.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingRequest(null)
      fetchData()
    } catch (err: any) {
      console.error('Error saving request:', err)
      show({ title: 'Error', description: err.message || 'Failed to save maintenance request', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request)
    setFormData({
      unit_id: request.unit_id.toString(),
      tenant_id: request.tenant_id,
      request_details: request.request_details,
      status: request.status,
      notes: request.notes || ''
    })
    setShowFormModal(true)
  }

  const handleDeleteClick = (request: MaintenanceRequest) => {
    setDeletingRequest(request)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRequest) return

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', deletingRequest.id)

      if (error) throw error
      
      setShowDeleteModal(false)
      setDeletingRequest(null)
      fetchData()
      show({ title: 'Request deleted', description: 'Maintenance request has been removed.', color: 'success' })
    } catch (err: any) {
      console.error('Error deleting request:', err)
      show({ title: 'Error', description: err.message || 'Failed to delete maintenance request', color: 'danger' })
    }
  }

  const updateStatus = async (request: MaintenanceRequest, newStatus: string) => {
    try {
      const updateData = {
        status: newStatus,
        date_completed: newStatus === 'completed' ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) throw error

      // Update unit status
      if (newStatus === 'in_progress') {
        await supabase
          .from('units')
          .update({ status: 'under_maintenance' })
          .eq('id', request.unit_id)
      } else if (newStatus === 'completed') {
        await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', request.unit_id)
      }

      fetchData()
      show({ title: 'Status updated', description: `Request marked as ${newStatus.replace('_', ' ')}.`, color: 'success' })
    } catch (err: any) {
      console.error('Error updating status:', err)
      show({ title: 'Error', description: err.message || 'Failed to update status', color: 'danger' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />
      case 'in_progress':
        return <Wrench className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingRequest(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading maintenance requests...</p>
        </div>
      </div>
    )
  }

  const underMaintenanceUnits = requests.filter(r => r.status !== 'completed').length

  return (
    <div className="min-h-full">
      {/* Under Maintenance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Under Maintenance</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">{underMaintenanceUnits}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">{stats.pending} pending requests</div>
        </div>
      </div>

      {/* Removed extra status cards per preference */}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1 capitalize">{request.status.replace('_', ' ')}</span>
                    </span>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Request #{request.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <Building className="h-4 w-4 mr-1" />
                        Unit
                      </div>
                      <div className="font-medium">Unit {request.units.unit_number}</div>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <User className="h-4 w-4 mr-1" />
                        Tenant
                      </div>
                      <div className="font-medium">{request.users.full_name}</div>
                    </div>

                    <div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        Submitted
                      </div>
                      <div className="font-medium">{new Date(request.date_submitted).toLocaleDateString()}</div>
                      {request.date_completed && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Completed: {new Date(request.date_completed).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Details</div>
                    <div className="text-sm">{request.request_details}</div>
                  </div>

                  {request.notes && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Admin Notes</div>
                      <div className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded">{request.notes}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {request.image_url && (
                    <a href={request.image_url} target="_blank" rel="noreferrer" className="block mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={request.image_url} alt="Attachment" className="h-20 w-28 object-cover rounded border" />
                    </a>
                  )}
                  {request.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(request, 'in_progress')}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Start Work
                    </Button>
                  )}
                  {request.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(request, 'completed')}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(request)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClick(request)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Maintenance Requests</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">All maintenance requests will appear here.</p>
            <Button 
              onClick={handleAddMaintenance}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Maintenance Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingRequest ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <Hammer className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingRequest ? 'Edit Maintenance Request' : 'New Maintenance Request'}
          </span>
        }
        description={editingRequest ? 'Update maintenance request details' : 'Create a new maintenance request'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Unit
              </label>
              <Select
                value={formData.unit_id}
                onChange={(value) => setFormData({ ...formData, unit_id: value })}
                placeholder="Select a unit"
                required
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Tenant
              </label>
              <Select
                value={formData.tenant_id}
                onChange={(value) => setFormData({ ...formData, tenant_id: value })}
                placeholder="Select a tenant"
                required
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Request Details
              </label>
              <Textarea
                value={formData.request_details}
                onChange={(e) => setFormData({ ...formData, request_details: e.target.value })}
                placeholder="Describe the maintenance issue..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
                placeholder="Select status"
                required
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Admin Notes
              </label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
              />
            </div>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (editingRequest ? 'Update Request' : 'Create Request')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Maintenance Request"
        message="Are you sure you want to delete this maintenance request? This action cannot be undone."
        confirmText="Delete Request"
        confirmVariant="destructive"
      />

      <div className="h-8"></div>
    </div>
  )
} 