import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is missing Supabase environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: tenants, error } = await supabase
      .from('users')
      .select('id, full_name, phone_number, role, created_at, updated_at, avatar_url')
      .eq('role', 'tenant')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const withEmails = await Promise.all(
      (tenants || []).map(async (t) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(t.id)
        return {
          ...t,
          email: authUser.user?.email || 'N/A'
        }
      })
    )

    return NextResponse.json({ tenants: withEmails })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 })
  }
} 