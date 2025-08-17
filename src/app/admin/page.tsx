'use client'

import { useEffect, useState } from 'react'
import * as React from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Building, Users, DollarSign, Wrench, TrendingUp, TrendingDown, Search } from 'lucide-react'
import LoadingAnimation from '@/components/ui/LoadingAnimation'
import clsx from 'clsx'

interface DashboardStats {
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  maintenanceUnits: number
  totalTenants: number
  monthlyRevenue: number
  pendingMaintenance: number
  recentPayments: number
  revenueThisMonth: number
  revenueLastMonth: number
  newTenantsThisMonth: number
  newTenantsLastMonth: number
  maintenanceThisMonth: number
  maintenanceLastMonth: number
}

interface RecentPayment {
  id: string
  lease_id: string
  tenant_id: string
  amount_paid: string
  payment_date: string
  payment_method: string
  status: string
  tenant_name?: string
  unit_number?: string
}

interface WeeklyActivityData {
  name: string
  newTenants: number
  newLeases: number
}

interface PropertyOverviewData {
  name: string
  value: number
  count: number
  color: string
}

// Real data will be fetched from database

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    maintenanceUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    pendingMaintenance: 0,
    recentPayments: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    newTenantsThisMonth: 0,
    newTenantsLastMonth: 0,
    maintenanceThisMonth: 0,
    maintenanceLastMonth: 0,
  })
  const [weeklyActivityData, setWeeklyActivityData] = useState<WeeklyActivityData[]>([])
  const [propertyOverviewData, setPropertyOverviewData] = useState<PropertyOverviewData[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRangePeriod, setDateRangePeriod] = useState<string>('week')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('date_desc')
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    fetchActivityData()
  }, [dateRangePeriod])

  const fetchActivityData = async () => {
    const activityData = await fetchWeeklyActivity(dateRangePeriod)
    setWeeklyActivityData(activityData)
  }

  const fetchDashboardStats = async () => {
    try {
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      const fmt = (d: Date) => d.toISOString().split('T')[0]

      // Get total units and their status breakdown
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('status')

      if (unitsError) throw unitsError

      const totalUnits = units?.length || 0
      const occupiedUnits = units?.filter(unit => unit.status === 'occupied').length || 0
      const vacantUnits = units?.filter(unit => unit.status === 'vacant').length || 0
      const maintenanceUnits = units?.filter(unit => unit.status === 'under_maintenance').length || 0

      // Get total tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('users')
        .select('id, created_at')
        .eq('role', 'tenant')

      if (tenantsError) throw tenantsError

      const totalTenants = tenants?.length || 0
      const newTenantsThisMonth = (tenants || []).filter(t => new Date((t as any).created_at) >= currentMonthStart && new Date((t as any).created_at) < nextMonthStart).length
      const newTenantsLastMonth = (tenants || []).filter(t => new Date((t as any).created_at) >= lastMonthStart && new Date((t as any).created_at) < currentMonthStart).length

      // Get pending maintenance requests
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id, date_submitted, status')

      if (maintenanceError) throw maintenanceError

      const pendingMaintenance = (maintenance || []).filter(m => (m as any).status === 'pending').length || 0
      const maintenanceThisMonth = (maintenance || []).filter(m => new Date((m as any).date_submitted) >= currentMonthStart && new Date((m as any).date_submitted) < nextMonthStart).length
      const maintenanceLastMonth = (maintenance || []).filter(m => new Date((m as any).date_submitted) >= lastMonthStart && new Date((m as any).date_submitted) < currentMonthStart).length

      // Get recent payments count
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount_paid, payment_for_month')

      if (paymentsError) throw paymentsError

      const recentPayments = payments?.length || 0
      const paymentsThisMonth = (payments || []).filter(p => {
        const d = new Date((p as any).payment_for_month)
        return d >= currentMonthStart && d < nextMonthStart
      }).reduce((sum, p: any) => sum + (parseFloat(p.amount_paid) || 0), 0)
      const paymentsLastMonth = (payments || []).filter(p => {
        const d = new Date((p as any).payment_for_month)
        return d >= lastMonthStart && d < currentMonthStart
      }).reduce((sum, p: any) => sum + (parseFloat(p.amount_paid) || 0), 0)

      // Calculate monthly revenue from active leases
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('rent_amount')
        .eq('is_active', true)

      if (leasesError) throw leasesError

      const monthlyRevenue = leases?.reduce((sum, lease) => sum + (parseFloat(lease.rent_amount) || 0), 0) || 0

      // Fetch weekly activity data (based on selected period)
      const weeklyData = await fetchWeeklyActivity(dateRangePeriod)

      // Fetch property overview data
      const propertyData = await fetchPropertyOverview(totalUnits, occupiedUnits, vacantUnits, maintenanceUnits)

      // Fetch recent payments data
      const recentPaymentsData = await fetchRecentPayments()

      setStats({
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        totalTenants,
        monthlyRevenue,
        pendingMaintenance,
        recentPayments,
        revenueThisMonth: paymentsThisMonth,
        revenueLastMonth: paymentsLastMonth,
        newTenantsThisMonth,
        newTenantsLastMonth,
        maintenanceThisMonth,
        maintenanceLastMonth,
      })

      setWeeklyActivityData(weeklyData)
      setPropertyOverviewData(propertyData)
      setRecentPayments(recentPaymentsData)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyActivity = async (period: string = 'week'): Promise<WeeklyActivityData[]> => {
    try {
      const today = new Date()
      let startDate: Date
      let endDate: Date
      let periodLabels: string[] = []
      let periodCount = 0

      // Set date ranges based on period
      if (period === 'week') {
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(today)
        periodLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        periodCount = 7
      } else if (period === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        periodCount = Math.ceil(endDate.getDate() / 7) // Number of weeks in month
        for (let i = 1; i <= periodCount; i++) {
          periodLabels.push(`Week ${i}`)
        }
      } else if (period === 'year') {
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date(today.getFullYear(), 11, 31)
        periodLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        periodCount = 12
      } else {
        // Default to week
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(today)
        periodLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        periodCount = 7
      }

      // Set time to start and end of day for proper filtering
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      
      // Get new tenants for the period
      const { data: periodTenants, error: tenantsError } = await supabase
        .from('users')
        .select('created_at')
        .eq('role', 'tenant')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Get new leases for the period
      const { data: periodLeases, error: leasesError } = await supabase
        .from('leases')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (tenantsError) {
        console.error('Tenants query error:', tenantsError)
        throw tenantsError
      }
      if (leasesError) {
        console.error('Leases query error:', leasesError)
        throw leasesError
      }

      const activityData: WeeklyActivityData[] = []

      if (period === 'week') {
        // Daily breakdown for week
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
          const dayName = periodLabels[date.getDay()]
          const dateStr = date.toISOString().split('T')[0]
          
          const dailyTenants = (periodTenants || []).filter((tenant: any) => {
            const tenantDate = new Date(tenant.created_at).toISOString().split('T')[0]
            return tenantDate === dateStr
          }).length

          const dailyLeases = (periodLeases || []).filter((lease: any) => {
            const leaseDate = new Date(lease.created_at).toISOString().split('T')[0]
            return leaseDate === dateStr
          }).length

          activityData.push({
            name: dayName,
            newTenants: dailyTenants,
            newLeases: dailyLeases
          })
        }
      } else if (period === 'month') {
        // Weekly breakdown for month
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        
        for (let week = 1; week <= periodCount; week++) {
          const weekStart = new Date(firstDay.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
          const weekEnd = new Date(Math.min(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000, lastDay.getTime()))
          
          const weekTenants = (periodTenants || []).filter((tenant: any) => {
            const tenantDate = new Date(tenant.created_at)
            return tenantDate >= weekStart && tenantDate <= weekEnd
          }).length

          const weekLeases = (periodLeases || []).filter((lease: any) => {
            const leaseDate = new Date(lease.created_at)
            return leaseDate >= weekStart && leaseDate <= weekEnd
          }).length

          activityData.push({
            name: `Week ${week}`,
            newTenants: weekTenants,
            newLeases: weekLeases
          })
        }
      } else if (period === 'year') {
        // Monthly breakdown for year
        for (let month = 0; month < 12; month++) {
          const monthStart = new Date(today.getFullYear(), month, 1)
          const monthEnd = new Date(today.getFullYear(), month + 1, 0)
          monthEnd.setHours(23, 59, 59, 999)
          
          const monthTenants = (periodTenants || []).filter((tenant: any) => {
            const tenantDate = new Date(tenant.created_at)
            return tenantDate >= monthStart && tenantDate <= monthEnd
          }).length

          const monthLeases = (periodLeases || []).filter((lease: any) => {
            const leaseDate = new Date(lease.created_at)
            return leaseDate >= monthStart && leaseDate <= monthEnd
          }).length

          activityData.push({
            name: periodLabels[month],
            newTenants: monthTenants,
            newLeases: monthLeases
          })
        }
      }

      return activityData
    } catch (error) {
      console.error('Error fetching activity data:', error)
      // Return appropriate empty data based on period
      const emptyData: WeeklyActivityData[] = []
      
      if (period === 'week') {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        daysOfWeek.forEach(day => {
          emptyData.push({ name: day, newTenants: 0, newLeases: 0 })
        })
      } else if (period === 'month') {
        for (let i = 1; i <= 4; i++) {
          emptyData.push({ name: `Week ${i}`, newTenants: 0, newLeases: 0 })
        }
      } else if (period === 'year') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        months.forEach(month => {
          emptyData.push({ name: month, newTenants: 0, newLeases: 0 })
        })
      }
      
      return emptyData
    }
  }

  const fetchPropertyOverview = async (totalUnits: number, occupiedUnits: number, vacantUnits: number, maintenanceUnits: number): Promise<PropertyOverviewData[]> => {
    try {
      // Get payment data for current month
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      const { data: monthlyPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_paid')
        .gte('payment_date', currentMonthStart.toISOString().split('T')[0])
        .lt('payment_date', nextMonthStart.toISOString().split('T')[0])

      if (paymentsError) {
        console.error('Payments query error:', paymentsError)
      }

      const totalPayments = (monthlyPayments || []).reduce((sum, payment: any) => sum + parseFloat(payment.amount_paid), 0)
      const paymentCount = (monthlyPayments || []).length

      const propertyOverview: PropertyOverviewData[] = []

      // UNITS SECTION - Unit status breakdown
      if (occupiedUnits > 0) {
        propertyOverview.push({
          name: 'Occupied Units',
          value: Math.round((occupiedUnits / totalUnits) * 100),
          count: occupiedUnits,
          color: '#3b82f6'
        })
      }

      if (vacantUnits > 0) {
        propertyOverview.push({
          name: 'Vacant Units',
          value: Math.round((vacantUnits / totalUnits) * 100),
          count: vacantUnits,
          color: '#3b82f6'
        })
      }

      if (maintenanceUnits > 0) {
        propertyOverview.push({
          name: 'Under Maintenance',
          value: Math.round((maintenanceUnits / totalUnits) * 100),
          count: maintenanceUnits,
          color: '#ef4444'
        })
      }

      // PAYMENTS SECTION - Payment data (separate from units)
      if (paymentCount > 0) {
        propertyOverview.push({
          name: 'Payments Received',
          value: 25, // Fixed percentage to show as separate section
          count: paymentCount,
          color: '#8b5cf6'
        })
      }

      if (occupiedUnits - paymentCount > 0) {
        propertyOverview.push({
          name: 'Outstanding Payments',
          value: 15, // Fixed percentage to show as separate section
          count: occupiedUnits - paymentCount,
          color: '#f59e0b'
        })
      }

      return propertyOverview
    } catch (error) {
      console.error('Error fetching property overview:', error)
      // Return default data if there's an error
      return [
        { name: 'No Data', value: 100, count: 0, color: '#64748b' }
      ]
    }
  }

  const fetchRecentPayments = async (): Promise<RecentPayment[]> => {
    try {
      // First, get recent payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(10)

      if (paymentsError) {
        console.error('Recent payments query error:', paymentsError)
        return []
      }

      if (!payments || payments.length === 0) {
        return []
      }

      // Get tenant names for these payments
      const tenantIds = [...new Set(payments.map(p => p.tenant_id).filter(Boolean))]
      const { data: tenants } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', tenantIds)

      // Get leases to connect payments to units
      const leaseIds = [...new Set(payments.map(p => p.lease_id).filter(Boolean))]
      const { data: leases } = await supabase
        .from('leases')
        .select('id, unit_id')
        .in('id', leaseIds)

      // Get unit numbers using unit_ids from leases
      const unitIds = [...new Set((leases || []).map(l => l.unit_id).filter(Boolean))]
      const { data: units } = await supabase
        .from('units')
        .select('id, unit_number')
        .in('id', unitIds)

      // Create lookup maps
      const tenantMap = new Map((tenants || []).map(t => [t.id, t.full_name]))
      const leaseToUnitMap = new Map((leases || []).map(l => [l.id, l.unit_id]))
      const unitMap = new Map((units || []).map(u => [u.id, u.unit_number]))

      // Transform the data to include tenant_name and unit_number
      const transformedPayments = payments.map((payment: any) => {
        const unitId = leaseToUnitMap.get(payment.lease_id)
        const unitNumber = unitId ? unitMap.get(unitId) : null
        
        return {
          id: payment.id,
          lease_id: payment.lease_id,
          tenant_id: payment.tenant_id,
          amount_paid: payment.amount_paid,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method || 'Bank Transfer',
          status: payment.status || 'completed',
          tenant_name: tenantMap.get(payment.tenant_id) || 'Unknown Tenant',
          unit_number: unitNumber || 'No Unit Assigned'
        }
      })

      return transformedPayments
    } catch (error) {
      console.error('Error fetching recent payments:', error)
      return []
    }
  }

  const occupancyRate = stats.totalUnits > 0 ? (stats.occupiedUnits / stats.totalUnits) * 100 : 0

  // Filter and sort payments
  const filteredAndSortedPayments = React.useMemo(() => {
    let filtered = recentPayments

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = recentPayments.filter(payment => 
        payment.tenant_name?.toLowerCase().includes(searchLower) ||
        payment.unit_number?.toLowerCase().includes(searchLower) ||
        payment.payment_method?.toLowerCase().includes(searchLower) ||
        payment.status?.toLowerCase().includes(searchLower) ||
        String(payment.id).toLowerCase().includes(searchLower) ||
        payment.amount_paid?.toString().includes(searchTerm)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        case 'date_asc':
          return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
        case 'amount_desc':
          return parseFloat(b.amount_paid || '0') - parseFloat(a.amount_paid || '0')
        case 'amount_asc':
          return parseFloat(a.amount_paid || '0') - parseFloat(b.amount_paid || '0')
        case 'tenant_name':
          return (a.tenant_name || '').localeCompare(b.tenant_name || '')
        case 'unit_number':
          const aUnit = a.unit_number === 'No Unit Assigned' ? '999' : a.unit_number || '999'
          const bUnit = b.unit_number === 'No Unit Assigned' ? '999' : b.unit_number || '999'
          return aUnit.localeCompare(bUnit)
        case 'status':
          return (a.status || '').localeCompare(b.status || '')
        case 'method':
          return (a.payment_method || '').localeCompare(b.payment_method || '')
        default:
          return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      }
    })

    return sorted
  }, [recentPayments, searchTerm, sortBy])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation 
          size={150} 
          message="Loading dashboard..." 
        />
      </div>
    )
  }

  return (
    <div className="min-h-full">

      {/* Top KPI Cards (enhanced) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue (payments) */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Total Revenue</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-4xl font-semibold leading-none">${stats.revenueThisMonth.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
            {(() => {
              const last = stats.revenueLastMonth
              const curr = stats.revenueThisMonth
              if (last === 0 && curr === 0) {
                return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">No data</span>
              }
              
              let pct: number
              let up: boolean
              
              if (last === 0 && curr > 0) {
                // When starting from 0, show 100% increase
                pct = 100
                up = true
              } else if (last > 0 && curr === 0) {
                // When going to 0, show 100% decrease
                pct = 100
                up = false
              } else {
                // Normal calculation with 1-100% cap
                up = curr >= last
                pct = Math.abs(((curr - last) / last) * 100)
                pct = Math.max(1, Math.min(100, pct)) // Cap between 1-100%
              }
              
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full', up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {up ? '↑' : '↓'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-4 text-xs text-gray-500">Based on recorded payments</div>
        </div>

        {/* New Tenants */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">New Tenants</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-4xl font-semibold leading-none">{stats.newTenantsThisMonth}</div>
            {(() => {
              const last = stats.newTenantsLastMonth
              const curr = stats.newTenantsThisMonth
              if (last === 0 && curr === 0) {
                return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">No data</span>
              }
              
              let pct: number
              let up: boolean
              
              if (last === 0 && curr > 0) {
                // When starting from 0, show 100% increase
                pct = 100
                up = true
              } else if (last > 0 && curr === 0) {
                // When going to 0, show 100% decrease
                pct = 100
                up = false
              } else {
                // Normal calculation with 1-100% cap
                up = curr >= last
                pct = Math.abs(((curr - last) / last) * 100)
                pct = Math.max(1, Math.min(100, pct)) // Cap between 1-100%
              }
              
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full', up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {up ? '↑' : '↓'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-4 text-xs text-gray-500">Registered this month</div>
        </div>

        {/* Maintenance Requests */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Maintenance Requests</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-4xl font-semibold leading-none">{stats.maintenanceThisMonth}</div>
            {(() => {
              const last = stats.maintenanceLastMonth
              const curr = stats.maintenanceThisMonth
              if (last === 0 && curr === 0) {
                return <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">No data</span>
              }
              
              let pct: number
              let isGood: boolean // For maintenance, fewer is better
              
              if (last === 0 && curr > 0) {
                // For maintenance requests, increase from 0 is bad (red)
                pct = 100
                isGood = false
              } else if (last > 0 && curr === 0) {
                // For maintenance requests, decrease to 0 is good (green)
                pct = 100
                isGood = true
              } else {
                // Normal calculation with 1-100% cap
                // For maintenance requests, fewer is better
                isGood = curr <= last
                pct = Math.abs(((curr - last) / last) * 100)
                pct = Math.max(1, Math.min(100, pct)) // Cap between 1-100%
              }
              
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full', isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {curr > last ? '↑' : '↓'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-4 text-xs text-gray-500">Requests submitted this month</div>
        </div>

        {/* Total Units */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Total Units</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Building className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <div className="text-4xl font-semibold leading-none">{stats.totalUnits}</div>
          </div>
          <div className="mt-4 text-xs text-gray-500">Occupancy: {occupancyRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Unit status summary moved to Units/Maintenance pages */}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Area Chart with Gradient */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>New Tenants & Leases</CardTitle>
              </div>
              <div className="w-32">
                <Select 
                  value={dateRangePeriod} 
                  onChange={setDateRangePeriod}
                  className="h-8 text-xs"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weeklyActivityData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tenantsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="leasesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>

                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickMargin={8}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  width={30}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="newLeases" 
                  stroke="#3b82f6" 
                  fill="url(#leasesGradient)"
                  strokeWidth={2}
                  fillOpacity={0.2}
                  connectNulls={true}
                />
                <Area 
                  type="monotone" 
                  dataKey="newTenants" 
                  stroke="#10b981" 
                  fill="url(#tenantsGradient)"
                  strokeWidth={2}
                  fillOpacity={0.3}
                  connectNulls={true}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">New Tenants</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">New Leases</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Overview Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="mb-1">Property Overview</CardTitle>
            <CardDescription>Units & Payments Status</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 mt-6">
              {/* Pie Chart - responsive size */}
              <div className="flex justify-center items-center flex-shrink-0 w-full max-w-xs">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={propertyOverviewData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {propertyOverviewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${props.payload?.count || value}`,
                        name
                      ]}
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legends - responsive layout */}
              <div className="flex flex-col justify-center gap-3 w-full lg:w-auto">
                {propertyOverviewData.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 justify-center lg:justify-start">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {item.name} ({item.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="mb-1">Recent Payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <div className="w-48">
                <Select 
                  value={sortBy} 
                  onChange={setSortBy}
                  className="h-9"
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="amount_desc">Amount (High to Low)</option>
                  <option value="amount_asc">Amount (Low to High)</option>
                  <option value="tenant_name">Tenant Name (A-Z)</option>
                  <option value="unit_number">Unit Number</option>
                  <option value="status">Status</option>
                  <option value="method">Payment Method</option>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {recentPayments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Payments Yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Payment transactions will appear here once tenants start making payments.</p>
              </div>
            ) : filteredAndSortedPayments.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Results Found</h3>
                <p className="text-gray-500 dark:text-gray-400">Try adjusting your search terms or filters.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium text-gray-500">NO</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">PAYMENT ID</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">TENANT NAME</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">UNIT NUMBER</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">DATE</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">METHOD</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">STATUS</th>
                    <th className="text-left p-2 text-sm font-medium text-gray-500">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPayments.map((payment, index) => (
                    <tr key={payment.id} className="border-b">
                      <td className="p-2 text-sm">{String(index + 1).padStart(2, '0')}</td>
                      <td className="p-2 text-sm">#{String(payment.id).slice(0, 8)}</td>
                      <td className="p-2 text-sm">{payment.tenant_name}</td>
                      <td className="p-2 text-sm">{
                        payment.unit_number === 'No Unit Assigned' 
                          ? payment.unit_number 
                          : `Unit ${payment.unit_number}`
                      }</td>
                      <td className="p-2 text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="p-2 text-sm">{payment.payment_method}</td>
                      <td className="p-2 text-sm">
                        <span className={clsx('px-2 py-1 rounded-full text-xs', {
                          'bg-green-100 text-green-800': payment.status === 'completed',
                          'bg-yellow-100 text-yellow-800': payment.status === 'pending',
                          'bg-red-100 text-red-800': payment.status === 'failed' || payment.status === 'rejected',
                          'bg-blue-100 text-blue-800': payment.status === 'processing'
                        })}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-2 text-sm">${parseFloat(payment.amount_paid || '0').toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bottom padding for proper scroll */}
      <div className="h-8"></div>
    </div>
  )
}