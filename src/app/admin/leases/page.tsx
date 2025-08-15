'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/calendar'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { FileText, Edit, Trash2, Plus, Calendar, DollarSign, User, Building, FilePlus, FileMinus2 } from 'lucide-react'
import { useAdminActions } from '@/components/admin/AdminContext'
import { useAlerts } from '@/components/ui/alerts'

interface Lease {
  id: number
  unit_id: number
  tenant_id: string
  start_date: string
  end_date: string
  rent_amount: string
  security_deposit: string | null
  is_active: boolean
  created_at: string
  units: {
    unit_number: string
    rent_amount: number
  }
  users: {
    full_name: string
  }
}

interface LeaseFormData {
  unit_id: string
  tenant_id: string
  start_date: string
  end_date: string
  rent_amount: string
  security_deposit: string
}

interface Unit {
  id: number
  unit_number: string
  status: string
  rent_amount: number
}

interface Tenant {
  id: string
  full_name: string
}

export default function LeasesManagement() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingLease, setEditingLease] = useState<Lease | null>(null)
  const [deletingLease, setDeletingLease] = useState<Lease | null>(null)
  const [formData, setFormData] = useState<LeaseFormData>({
    unit_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    rent_amount: '',
    security_deposit: ''
  })
  const [error, setError] = useState('')
  const supabase = createClient()
  const { setActions } = useAdminActions()
  const { show } = useAlerts()

  const handleAddLease = () => {
    setEditingLease(null)
    setFormData({
      unit_id: '',
      tenant_id: '',
      start_date: '',
      end_date: '',
      rent_amount: '',
      security_deposit: ''
    })
    setShowFormModal(true)
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setActions({ onAddLease: handleAddLease })
  }, [setActions])

  const fetchData = async () => {
    try {
      // Fetch leases with unit and tenant info
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          *,
          units (unit_number, rent_amount),
          users (full_name)
        `)
        .order('created_at', { ascending: false })

      if (leasesError) throw leasesError

      // Fetch available units (vacant or under maintenance) with rent amounts
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, unit_number, status, rent_amount')
        .order('unit_number')

      if (unitsError) throw unitsError

      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'tenant')
        .order('full_name')

      if (tenantsError) throw tenantsError

      setLeases(leasesData || [])
      setUnits(unitsData || [])
      setTenants(tenantsData || [])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  // Handle unit selection change to auto-populate rent amount
  const handleUnitChange = (unitId: string) => {
    const selectedUnit = units.find(unit => unit.id.toString() === unitId)
    const rentAmount = selectedUnit ? selectedUnit.rent_amount.toString() : ''
    
    setFormData({ 
      ...formData, 
      unit_id: unitId,
      rent_amount: rentAmount
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const leaseData = {
        unit_id: parseInt(formData.unit_id),
        tenant_id: formData.tenant_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        rent_amount: parseFloat(formData.rent_amount),
        security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
        is_active: true
      }

      if (editingLease) {
        // Update existing lease
        const { error } = await supabase
          .from('leases')
          .update({
            ...leaseData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLease.id)

        if (error) throw error
        show({ title: 'Lease updated', description: 'The lease has been updated.', color: 'success' })
      } else {
        // Create new lease
        const { error } = await supabase
          .from('leases')
          .insert([leaseData])

        if (error) throw error

        // Update unit status to occupied
        const { error: unitError } = await supabase
          .from('units')
          .update({ status: 'occupied' })
          .eq('id', parseInt(formData.unit_id))

        if (unitError) throw unitError
        show({ title: 'Lease created', description: 'A new lease has been created and unit marked occupied.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingLease(null)
      fetchData()
    } catch (err: any) {
      console.error('Error saving lease:', err)
      setError(err.message || 'Error saving lease')
      show({ title: 'Error', description: err.message || 'Failed to save lease', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (lease: Lease) => {
    setEditingLease(lease)
    
    // Find the unit to get the current rent amount
    const selectedUnit = units.find(unit => unit.id === lease.unit_id)
    const unitRentAmount = selectedUnit ? selectedUnit.rent_amount.toString() : lease.rent_amount
    
    setFormData({
      unit_id: lease.unit_id.toString(),
      tenant_id: lease.tenant_id,
      start_date: lease.start_date,
      end_date: lease.end_date,
      rent_amount: unitRentAmount, // Use unit's current rent amount, not lease's stored amount
      security_deposit: lease.security_deposit || ''
    })
    setShowFormModal(true)
  }

  const handleDeleteClick = (lease: Lease) => {
    setDeletingLease(lease)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingLease) return

    try {
      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', deletingLease.id)

      if (error) throw error

      // Update unit status back to vacant
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', deletingLease.unit_id)

      if (unitError) throw unitError

      setShowDeleteModal(false)
      setDeletingLease(null)
      fetchData()
      show({ title: 'Lease deleted', description: 'The lease has been removed and unit set to vacant.', color: 'success' })
    } catch (err: any) {
      console.error('Error deleting lease:', err)
      setError(err.message || 'Error deleting lease')
      show({ title: 'Error', description: err.message || 'Failed to delete lease', color: 'danger' })
    }
  }

  const toggleLeaseStatus = async (lease: Lease) => {
    try {
      const { error } = await supabase
        .from('leases')
        .update({ 
          is_active: !lease.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', lease.id)

      if (error) throw error

      // Update unit status
      const newUnitStatus = !lease.is_active ? 'occupied' : 'vacant'
      const { error: unitError } = await supabase
        .from('units')
        .update({ status: newUnitStatus })
        .eq('id', lease.unit_id)

      if (unitError) throw unitError

      fetchData()
      show({ title: 'Lease status updated', description: `Lease is now ${!lease.is_active ? 'active' : 'inactive'}.`, color: 'success' })
    } catch (err: any) {
      console.error('Error updating lease status:', err)
      setError(err.message || 'Error updating lease status')
      show({ title: 'Error', description: err.message || 'Failed to update lease status', color: 'danger' })
    }
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingLease(null)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading leases...</p>
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

      {/* Leases Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {leases.map((lease) => (
          <Card key={lease.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-6 w-6 mr-3 text-blue-600" />
                  Lease #{lease.id}
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lease.is_active 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {lease.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Unit {lease.units.unit_number}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{lease.users.full_name}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                  <span>${Number(lease.units.rent_amount).toLocaleString()}/month</span>
                </div>
                {lease.security_deposit && (
                  <div className="text-xs text-gray-500">
                    Security Deposit: ${Number(lease.security_deposit).toLocaleString()}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(lease)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleLeaseStatus(lease)}
                  className={lease.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                >
                  {lease.is_active ? (
                    <>
                      <FileMinus2 className="h-4 w-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <FilePlus className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClick(lease)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {leases.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Leases Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create lease agreements between tenants and units.</p>
            <Button 
              onClick={handleAddLease}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Lease
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Lease Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingLease ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <FileText className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingLease ? 'Edit Lease' : 'Create New Lease'}
          </span>
        }
        description={editingLease ? 'Update lease information' : 'Create a lease agreement between tenant and unit'}
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
                onChange={handleUnitChange}
                placeholder="Select a unit"
                required
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unit_number} ({unit.status})
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

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Start Date
              </label>
              <DatePicker
                value={formData.start_date}
                onChange={(value) => setFormData({ ...formData, start_date: value })}
                placeholder="Select start date"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                End Date
              </label>
              <DatePicker
                value={formData.end_date}
                onChange={(value) => setFormData({ ...formData, end_date: value })}
                placeholder="Select end date"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Monthly Rent ($)
              </label>
              <Input
                type="number"
                value={formData.rent_amount}
                min="0"
                step="0.01"
                placeholder="Select a unit to see rent amount"
                required
                disabled
                className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Rent amount is automatically set based on the selected unit
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Security Deposit ($)
              </label>
              <Input
                type="number"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                min="0"
                step="0.01"
                placeholder="0.00"
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
            <Button 
              type="submit" 
              disabled={saving}
            >
              {saving ? 'Saving...' : (editingLease ? 'Update Lease' : 'Create Lease')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lease"
        message="Are you sure you want to delete this lease? This action cannot be undone and will set the unit status back to vacant."
        confirmText="Delete Lease"
        confirmVariant="destructive"
      />

      <div className="h-8"></div>
    </div>
  )
} 