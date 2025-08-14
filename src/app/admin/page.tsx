'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Building, Users, DollarSign, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
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

// Sample data for charts
const salesData = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 200 },
  { name: 'Thu', value: 278 },
  { name: 'Fri', value: 189 },
  { name: 'Sat', value: 239 },
  { name: 'Sun', value: 349 },
]

const categoryData = [
  { name: 'Rent Payments', value: 65, color: '#3b82f6' },
  { name: 'Maintenance', value: 20, color: '#ef4444' },
  { name: 'Utilities', value: 15, color: '#10b981' },
]

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
      }).reduce((sum, p: any) => sum + Number(p.amount_paid), 0)
      const paymentsLastMonth = (payments || []).filter(p => {
        const d = new Date((p as any).payment_for_month)
        return d >= lastMonthStart && d < currentMonthStart
      }).reduce((sum, p: any) => sum + Number(p.amount_paid), 0)

      // Calculate monthly revenue from active leases
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('rent_amount')
        .eq('is_active', true)

      if (leasesError) throw leasesError

      const monthlyRevenue = leases?.reduce((sum, lease) => sum + Number(lease.rent_amount), 0) || 0

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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const occupancyRate = stats.totalUnits > 0 ? (stats.occupiedUnits / stats.totalUnits) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
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
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>LAST WEEK</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>CURRENT MONTH</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-64">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend positioned at bottom right */}
              <div className="absolute bottom-0 right-0 space-y-1">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{item.name} ({item.value}%)</span>
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