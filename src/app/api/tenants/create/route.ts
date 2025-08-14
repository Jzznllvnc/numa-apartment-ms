import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, password, full_name, phone_number } = await req.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is missing Supabase environment variables' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Create auth user (admin)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 400 })
    }

    // Upsert profile in users table (avoid duplicate key if profile already exists)
    const { error: profileError } = await supabase
      .from('users')
      .upsert(
        {
          id: authData.user.id,
          full_name,
          phone_number: phone_number || null,
          role: 'tenant'
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      // Best-effort cleanup only if insert truly failed and not due to conflict
      // Postgres unique_violation is 23505; with upsert, should not happen, but keep guard
      if ((profileError as any)?.code !== '23505') {
        await supabase.auth.admin.deleteUser(authData.user.id)
      }
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user_id: authData.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 })
  }
} 