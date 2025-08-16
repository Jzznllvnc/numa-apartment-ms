'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker, MonthPicker } from '@/components/ui/calendar'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { DollarSign, Edit, Trash2, Plus, Calendar, User, Building, CreditCard, Printer } from 'lucide-react'
import { useAlerts } from '@/components/ui/alerts'
import LoadingAnimation from '@/components/ui/LoadingAnimation'
import { useAdminActions } from '@/components/admin/AdminContext'

interface Payment {
  id: number
  lease_id: number
  tenant_id: string
  amount_paid: string
  payment_date: string
  payment_for_month: string
  payment_method: string | null
  notes: string | null
  created_at: string
  leases: {
    units: {
      unit_number: string
    }
  }
  users: {
    full_name: string
  }
}

interface PaymentFormData {
  tenant_id: string
  lease_id: string
  amount_paid: string
  payment_date: string
  payment_for_month: string
  payment_method: string
  notes: string
}

interface Lease {
  id: number
  tenant_id: string
  rent_amount: string
  units: {
    unit_number: string
  }
  users: {
    full_name: string
  }
}

interface TenantOption {
  id: string
  full_name: string
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [printingPayment, setPrintingPayment] = useState<Payment | null>(null)
  const [formData, setFormData] = useState<PaymentFormData>({
    tenant_id: '',
    lease_id: '',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_for_month: new Date().toISOString().split('T')[0].slice(0, 7),
    payment_method: 'Bank Transfer',
    notes: ''
  })
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalCollected: 0,
    thisMonth: 0,
    pendingCount: 0
  })
  const supabase = createClient()
  const { show } = useAlerts()
  const { setActions } = useAdminActions()

  useEffect(() => {
    fetchData()
    setActions({ onAddPayment: handleAddPayment })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      // Fetch payments with lease and tenant info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          leases (
            units (unit_number)
          ),
          users (full_name)
        `)
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError

      // Fetch active leases
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          tenant_id,
          rent_amount,
          units!inner (unit_number),
          users!inner (full_name)
        `)
        .eq('is_active', true)
        .order('id')

      if (leasesError) throw leasesError

      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'tenant')
        .order('full_name')

      if (tenantsError) throw tenantsError

      setPayments(paymentsData || [])
      // Transform the leases data to match our interface
      setLeases((leasesData || []).map(lease => ({
        ...lease,
        units: Array.isArray(lease.units) ? lease.units[0] : lease.units,
        users: Array.isArray(lease.users) ? lease.users[0] : lease.users
      })) as Lease[])
      setTenants((tenantsData || []) as TenantOption[])

      // Calculate stats
      const currentMonth = new Date().toISOString().slice(0, 7)
      const totalCollected = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount_paid), 0) || 0
      const thisMonth = paymentsData?.filter(payment => 
        payment.payment_for_month.startsWith(currentMonth)
      ).reduce((sum, payment) => sum + Number(payment.amount_paid), 0) || 0

      setStats({
        totalCollected,
        thisMonth,
        pendingCount: leasesData?.length || 0
      })

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = () => {
    setEditingPayment(null)
    setFormData({
      tenant_id: '',
      lease_id: '',
      amount_paid: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_for_month: new Date().toISOString().split('T')[0].slice(0, 7),
      payment_method: 'Bank Transfer',
      notes: ''
    })
    setShowFormModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!formData.tenant_id || !formData.lease_id) {
        throw new Error('Please select both a tenant and a lease')
      }

      const selectedLease = leases.find(lease => lease.id === parseInt(formData.lease_id))
      if (!selectedLease) throw new Error('Please select a valid lease')
      if (selectedLease.tenant_id !== formData.tenant_id) {
        throw new Error('Selected lease does not belong to the chosen tenant')
      }

      const paymentData = {
        lease_id: parseInt(formData.lease_id),
        tenant_id: formData.tenant_id,
        amount_paid: parseFloat(formData.amount_paid),
        payment_date: formData.payment_date,
        payment_for_month: formData.payment_for_month + '-01',
        payment_method: formData.payment_method,
        notes: formData.notes || null
      }

      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editingPayment.id)
        if (error) throw error
        show({ title: 'Payment updated', description: 'The payment record has been updated.', color: 'success' })
      } else {
        const { error } = await supabase
          .from('payments')
          .insert([paymentData])
        if (error) throw error
        show({ title: 'Payment logged', description: 'The payment has been recorded successfully.', color: 'success' })
      }

      setShowFormModal(false)
      setEditingPayment(null)
      fetchData()
    } catch (err: any) {
      console.error('Error saving payment:', err)
      setError(err.message || 'Error saving payment')
      show({ title: 'Error', description: err.message || 'Failed to save payment', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment)
    setFormData({
      tenant_id: payment.tenant_id,
      lease_id: payment.lease_id.toString(),
      amount_paid: payment.amount_paid,
      payment_date: payment.payment_date,
      payment_for_month: payment.payment_for_month.slice(0, 7),
      payment_method: payment.payment_method || 'Bank Transfer',
      notes: payment.notes || ''
    })
    setShowFormModal(true)
  }

  const handleDeleteClick = (payment: Payment) => {
    setDeletingPayment(payment)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPayment) return

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', deletingPayment.id)

      if (error) throw error
      
      setShowDeleteModal(false)
      setDeletingPayment(null)
      fetchData()
      show({ title: 'Payment deleted', description: 'The payment record has been removed.', color: 'success' })
    } catch (err: any) {
      console.error('Error deleting payment:', err)
      setError(err.message || 'Error deleting payment')
      show({ title: 'Error', description: err.message || 'Failed to delete payment', color: 'danger' })
    }
  }

  const handlePrint = (payment: Payment) => {
    setPrintingPayment(payment)
    setShowPrintModal(true)
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditingPayment(null)
    setError('')
  }

  const filteredLeases = formData.tenant_id
    ? leases.filter(l => l.tenant_id === formData.tenant_id)
    : leases

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation 
          size={150} 
          message="Loading payments..." 
        />
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

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Total Collected</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">${stats.totalCollected.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">All time payments</div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">This Month</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">${stats.thisMonth.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Current month payments</div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Active Leases</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Building className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">{stats.pendingCount}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Currently active leases</div>
        </div>
      </div>

      {/* Quick action handled by header's QuickActions; remove local button */}

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>All rent payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Tenant
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Amount
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Payment Date
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Notes</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payment.users.full_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Unit {payment.leases.units.unit_number}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-lg text-gray-900 dark:text-gray-100">${Number(payment.amount_paid).toLocaleString()}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">For: {new Date(payment.payment_for_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{new Date(payment.payment_date).toLocaleDateString()}</div>
                          {payment.payment_method && (
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {payment.payment_method}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {payment.notes || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(payment)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(payment)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(payment)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Payments Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Start logging rent payments from your tenants.</p>
              <Button 
                onClick={handleAddPayment}
              >
                <Plus className="h-4 w-4 mr-2" />
                Log Tenant Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Payment Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeModal}
        title={
          <span className="flex items-center">
            {(editingPayment ? <Edit className="h-6 w-6 mr-3 text-blue-600 mb-1" /> : <CreditCard className="h-6 w-6 mr-3 text-blue-600 mb-1" />)}
            {editingPayment ? 'Edit Payment' : 'Log New Payment'}
          </span>
        }
        description={editingPayment ? 'Update payment information' : 'Record a rent payment from a tenant'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Tenant
              </label>
              <Select
                value={formData.tenant_id}
                onChange={(value) => {
                  const tenantLeases = leases.filter(l => l.tenant_id === value)
                  
                  setFormData(prev => {
                    const newFormData = {
                      ...prev,
                      tenant_id: value,
                      // Clear lease_id if current lease doesn't belong to new tenant
                      lease_id: prev.lease_id && leases.find(l => l.id === parseInt(prev.lease_id))?.tenant_id === value ? prev.lease_id : ''
                    }
                    
                    // Auto-prefill lease if tenant has exactly one active lease
                    if (tenantLeases.length === 1) {
                      newFormData.lease_id = tenantLeases[0].id.toString()
                      // Also prefill the rent amount if not already set
                      if (!newFormData.amount_paid) {
                        newFormData.amount_paid = tenantLeases[0].rent_amount
                      }
                    }
                    
                    return newFormData
                  })
                }}
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
                Amount Paid ($)
              </label>
              <Input
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Lease (Tenant - Unit)
              </label>
              <Select
                value={formData.lease_id}
                onChange={(value) => {
                  const selectedLease = leases.find(lease => lease.id === parseInt(value))
                  setFormData({ 
                    ...formData, 
                    lease_id: value,
                    tenant_id: selectedLease ? selectedLease.tenant_id : formData.tenant_id,
                    amount_paid: selectedLease ? selectedLease.rent_amount : formData.amount_paid
                  })
                }}
                placeholder="Select a lease"
                required
              >
                {filteredLeases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {`Unit ${lease.units.unit_number} ($${Number(lease.rent_amount).toLocaleString()})`}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Payment For Month
              </label>
              <MonthPicker
                value={formData.payment_for_month}
                onChange={(value) => setFormData({ ...formData, payment_for_month: value })}
                placeholder="Select month"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Payment Date
              </label>
              <DatePicker
                value={formData.payment_date}
                onChange={(value) => setFormData({ ...formData, payment_date: value })}
                placeholder="Select payment date"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Payment Method
              </label>
              <Select
                value={formData.payment_method}
                onChange={(value) => setFormData({ ...formData, payment_method: value })}
                placeholder="Select payment method"
                required
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Online Payment">Online Payment</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Notes (Optional)
              </label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
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
              {saving ? 'Saving...' : (editingPayment ? 'Update Payment' : 'Log Payment')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record? This action cannot be undone."
        confirmText="Delete Payment"
        confirmVariant="destructive"
      />

      {/* Print Receipt Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`Payment Receipt for ${printingPayment?.users.full_name}`}
        size="lg"
      >
        <style jsx>{`
          @media print {
            @page {
              margin: 0;
              size: auto;
              -webkit-print-color-adjust: exact;
            }
            body {
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            * {
              -webkit-print-color-adjust: exact;
            }
            .fixed.inset-0.z-\\[100\\] .px-6.py-4.border-b button {
              display: none !important;
            }
            .flex.items-center.justify-between button {
              display: none !important;
            }
            button.h-8.w-8.p-0 {
              display: none !important;
            }
          }
        `}</style>
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header for both screen and print */}
            <div className="flex items-center justify-between mb-6 print:mb-8">
              <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black print:text-base">
                {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-3">
                <img 
                  src="/ams.png" 
                  alt="Logo" 
                  className="h-8 w-8 print:h-10 print:w-10" 
                />
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200 print:text-black print:text-xl">
                  Numa - Apartment MS
                </span>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 print:text-black">Payment Receipt</h2>
            </div>
            
            <div className="border-2 border-gray-800 dark:border-gray-300 print:border-black p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 print:text-black mb-4">Payment Details</h3>
              
              <div className="space-y-3">
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Tenant:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">{printingPayment?.users.full_name}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Unit:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">Unit {printingPayment?.leases.units.unit_number}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Amount Paid:</span>
                  <span className="text-xl font-bold text-gray-800 dark:text-gray-200 print:text-black">${Number(printingPayment?.amount_paid).toLocaleString()}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Payment For:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">{printingPayment ? new Date(printingPayment.payment_for_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Payment Date:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">{printingPayment ? new Date(printingPayment.payment_date).toLocaleDateString() : ''}</span>
                </div>
                {printingPayment?.payment_method && (
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Payment Method:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">{printingPayment.payment_method}</span>
                </div>
                )}
                {printingPayment?.notes && (
                <div className="flex">
                  <span className="font-semibold w-1/3 text-gray-800 dark:text-gray-200 print:text-black">Notes:</span>
                  <span className="text-gray-800 dark:text-gray-200 print:text-black">{printingPayment.notes}</span>
                </div>
                )}
              </div>
            </div>
            
            <div className="text-center text-gray-500 dark:text-gray-400 print:text-black text-xs print:text-sm">
              <p>Receipt generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 print:hidden">
            <Button 
              variant="outline" 
              onClick={() => setShowPrintModal(false)}
            >
              Close
            </Button>
            <Button 
              onClick={() => window.print()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </Modal>

      <div className="h-8"></div>
    </div>
  )
} 