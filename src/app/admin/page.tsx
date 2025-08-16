'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Building, Users, DollarSign, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [])

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

      // Fetch weekly activity data (last 7 days)
      const weeklyData = await fetchWeeklyActivity()

      // Fetch property overview data
      const propertyData = await fetchPropertyOverview(totalUnits, occupiedUnits, vacantUnits, maintenanceUnits)

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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWeeklyActivity = async (): Promise<WeeklyActivityData[]> => {
    try {
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Set time to start and end of day for proper filtering
      const startOfWeek = new Date(weekAgo)
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)
      
      // Get new tenants from last 7 days
      const { data: weeklyTenants, error: tenantsError } = await supabase
        .from('users')
        .select('created_at')
        .eq('role', 'tenant')
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfToday.toISOString())

      // Get new leases from last 7 days
      const { data: weeklyLeases, error: leasesError } = await supabase
        .from('leases')
        .select('created_at')
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfToday.toISOString())

      if (tenantsError) {
        console.error('Tenants query error:', tenantsError)
        throw tenantsError
      }
      if (leasesError) {
        console.error('Leases query error:', leasesError)
        throw leasesError
      }

      // Initialize data for last 7 days
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const weeklyData: WeeklyActivityData[] = []
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        const dayName = daysOfWeek[date.getDay()]
        const dateStr = date.toISOString().split('T')[0]
        
        // Count new tenants for this day
        const dailyTenants = (weeklyTenants || []).filter((tenant: any) => {
          const tenantDate = new Date(tenant.created_at).toISOString().split('T')[0]
          return tenantDate === dateStr
        }).length

        // Count new leases for this day
        const dailyLeases = (weeklyLeases || []).filter((lease: any) => {
          const leaseDate = new Date(lease.created_at).toISOString().split('T')[0]
          return leaseDate === dateStr
        }).length

        weeklyData.push({
          name: dayName,
          newTenants: dailyTenants,
          newLeases: dailyLeases
        })
      }

      return weeklyData
    } catch (error) {
      console.error('Error fetching weekly activity:', error)
      // Return empty data if there's an error
      return [
        { name: 'Sun', newTenants: 0, newLeases: 0 },
        { name: 'Mon', newTenants: 0, newLeases: 0 },
        { name: 'Tue', newTenants: 0, newLeases: 0 },
        { name: 'Wed', newTenants: 0, newLeases: 0 },
        { name: 'Thu', newTenants: 0, newLeases: 0 },
        { name: 'Fri', newTenants: 0, newLeases: 0 },
        { name: 'Sat', newTenants: 0, newLeases: 0 },
      ]
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

  const occupancyRate = stats.totalUnits > 0 ? (stats.occupiedUnits / stats.totalUnits) * 100 : 0

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
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">${stats.revenueThisMonth.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
            {(() => {
              const last = stats.revenueLastMonth
              const curr = stats.revenueThisMonth
              const up = last === 0 ? curr > 0 : curr >= last
              const pct = last === 0 ? 100 : Math.abs(((curr - last) / last) * 100)
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full self-center', up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {up ? '↑' : '↓'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-2 text-xs text-gray-500">Based on recorded payments</div>
        </div>

        {/* New Tenants */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">New Tenants</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">{stats.newTenantsThisMonth}</div>
            {(() => {
              const last = stats.newTenantsLastMonth
              const curr = stats.newTenantsThisMonth
              const up = last === 0 ? curr > 0 : curr >= last
              const pct = last === 0 ? 100 : Math.abs(((curr - last) / last) * 100)
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full self-center', up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {up ? '↑' : '↓'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-2 text-xs text-gray-500">Registered this month</div>
        </div>

        {/* Maintenance Requests */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Maintenance Requests</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">{stats.maintenanceThisMonth}</div>
            {(() => {
              const last = stats.maintenanceLastMonth
              const curr = stats.maintenanceThisMonth
              // For requests, down is good
              const up = curr <= last
              const pct = last === 0 ? 100 : Math.abs(((curr - last) / last) * 100)
              return (
                <span className={clsx('text-xs px-2 py-1 rounded-full self-center', up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {up ? '↓' : '↑'} {pct.toFixed(1)}%
                </span>
              )
            })()}
          </div>
          <div className="mt-2 text-xs text-gray-500">Requests submitted this month</div>
        </div>

        {/* Total Units */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-300">Total Units</div>
            <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Building className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-3xl font-semibold leading-none">{stats.totalUnits}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Occupancy: {occupancyRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Unit status summary moved to Units/Maintenance pages */}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Area Chart with Gradient */}
        <Card>
          <CardHeader>
            <CardTitle>New Tenants & Leases</CardTitle>
            <CardDescription>LAST 7 DAYS</CardDescription>
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
            <CardTitle>Property Overview</CardTitle>
            <CardDescription>UNITS & PAYMENTS STATUS</CardDescription>
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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-gray-500">NO</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">ID CUSTOMER</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">CUSTOMER NAME</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">CUSTOMER ADDRESS</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">DATE</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">TYPE</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">STATUS</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-500">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 text-sm">01</td>
                  <td className="p-2 text-sm">#065499</td>
                  <td className="p-2 text-sm">Aurelien Salomon</td>
                  <td className="p-2 text-sm">089 Kutch Green Apt. 448</td>
                  <td className="p-2 text-sm">04 Sep 2019</td>
                  <td className="p-2 text-sm">Electric</td>
                  <td className="p-2 text-sm">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Completed
                    </span>
                  </td>
                  <td className="p-2 text-sm">$100</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-sm">02</td>
                  <td className="p-2 text-sm">#065455</td>
                  <td className="p-2 text-sm">Manuel Rovira</td>
                  <td className="p-2 text-sm">089 Kutch Green Apt. 448</td>
                  <td className="p-2 text-sm">04 Sep 2019</td>
                  <td className="p-2 text-sm">Clothing</td>
                  <td className="p-2 text-sm">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                      Rejected
                    </span>
                  </td>
                  <td className="p-2 text-sm">$200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom padding for proper scroll */}
      <div className="h-8"></div>
    </div>
  )
}