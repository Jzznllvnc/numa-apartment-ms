'use client'

import { AdminLayout } from '@/components/admin/Sidebar'

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
