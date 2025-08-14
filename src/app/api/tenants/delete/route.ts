import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is missing Supabase environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Delete from users table first (to cascade)
    const { error: profileError } = await supabase.from('users').delete().eq('id', user_id)
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Delete auth user (best-effort)
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id)
    if (authError) {
      // Not fatal for API; just log
      console.error('Error deleting auth user:', authError)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 })
  }
} 