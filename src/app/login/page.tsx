'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Oleo_Script } from 'next/font/google'
import { SessionManager } from '@/utils/sessionManager'
import PasswordInput from '@/components/PasswordInput'

const oleoScript = Oleo_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
})

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = SessionManager.getRememberedEmail()
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
    
    // Initialize session management
    SessionManager.initializeSessionManagement()
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase configuration missing. Please check your .env.local file.')
        return
      }

      // Handle remember me functionality
      SessionManager.setRememberMe(email, rememberMe)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (data.user) {
        // Set up session cleanup if needed
        if (!rememberMe) {
          SessionManager.setupSessionCleanup()
        }

        // Get user role to redirect to appropriate dashboard
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          if (userError.code === 'PGRST116') {
            setError('User profile not found. Please contact admin or check database setup.')
          } else if (userError.code === '42P01') {
            setError('Database tables not found. Please run the SQL schema in Supabase.')
          } else {
            setError(`Database error: ${userError.message}. Check your Supabase setup.`)
          }
          return
        }

        // Redirect based on role
        if (userData.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/tenant')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Logo and Brand - Top Left */}
      <div className="absolute top-6 left-6 flex items-center z-10">
        <Image
          src="/ams.png"
          alt="AMS Logo"
          width={1024}
          height={1024}
          className="h-14 w-14 mr-2"
        />
        <h1 className={`text-[2.5rem] font-bold text-gray-900 ${oleoScript.className}`}>
          Numa
        </h1>
      </div>

      {/* Copyright - Bottom Left */}
      <div className="absolute bottom-6 left-6 text-xs text-gray-500 z-10">
        Copyright © 2025 Numa Enterprises LTD.
      </div>

      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Enter your email and password to access your account.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <div className="font-medium">Error:</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Environment Check */}
          {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
              <div className="font-medium">Setup Required:</div>
              <div className="text-sm">Please configure your .env.local file with Supabase credentials.</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember Me
                </label>
              </div>
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot Your Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Don&apos;t Have An Account? </span>
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Register Now
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-purple-700 rounded-tl-2xl rounded-bl-2xl overflow-hidden m-2 mr-0 flex-col justify-center items-center text-white p-6">
        <h2 className="text-4xl font-bold mb-4 max-w-lg text-center opacity-0 animate-slide-up-delay-1">
          Your Home, Your Rules.<br />
          Managed with <span className={`${oleoScript.className}`}>Numa.</span>
        </h2>
        <p className="text-base mb-12 max-w-lg text-center opacity-0 animate-slide-up-delay-2">
          Log in to your account and start streamlining<br />
          your operations today.
        </p>
        <Image
          src="/login.svg"
          alt="Dashboard Preview"
          width={1600}
          height={1200}
          className="rounded-lg max-w-[80%] h-auto opacity-0 animate-slide-up-delay-3"
        />
      </div>
    </div>
  )
}