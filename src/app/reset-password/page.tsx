'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Oleo_Script } from 'next/font/google'
import PasswordInput from '@/components/PasswordInput'
import LoadingAnimation from '@/components/ui/LoadingAnimation'

const oleoScript = Oleo_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
})

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get the session to check if user came from reset email
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setValidSession(true)
        } else {
          // Check for hash fragments that might contain the session
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')
          
          if (access_token && refresh_token) {
            // Set the session from URL fragments
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token
            })
            
            if (!error) {
              setValidSession(true)
              // Clean up the URL
              window.history.replaceState({}, document.title, window.location.pathname)
            } else {
              setError('Invalid or expired reset link. Please request a new password reset.')
            }
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
        setError('An error occurred while verifying your reset link.')
      } finally {
        setChecking(false)
      }
    }

    checkSession()
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password updated successfully! Redirecting to login...')
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/login')
      }, 2000)
      
    } catch (err) {
      console.error('Password reset error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingAnimation 
          size={120} 
          message="Verifying reset link..." 
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Logo and Brand - Top Left */}
      <div className="absolute top-6 left-6 flex items-center z-10">
        <Image
          src="/images/ams.png"
          alt="AMS Logo"
          width={1024}
          height={1024}
          className="h-14 w-14 mr-2"
        />
        <h1 className={`text-4xl font-bold text-gray-900 ${oleoScript.className}`}>
          Numa
        </h1>
      </div>

      {/* Copyright - Bottom Left */}
      <div className="absolute bottom-6 left-6 text-xs text-gray-500 z-10">
        Copyright © 2025 Numa Enterprises LTD.
      </div>

      {/* Left Side - Reset Password Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h2>
            <p className="text-gray-600">
              Please enter your new password below.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <div className="font-medium">Error:</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <div className="font-medium">Success!</div>
              <div className="text-sm">{success}</div>
            </div>
          )}

          {validSession ? (
            /* Reset Password Form */
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          ) : (
            /* Invalid Session Message */
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                This reset link is invalid or has expired.
              </p>
              <Link 
                href="/forgot-password" 
                className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Request New Reset Link
              </Link>
            </div>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Remember your password? </span>
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-blue-600 to-purple-700 rounded-tl-2xl rounded-bl-2xl overflow-hidden m-2 mr-0">
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-6">
          <div className="max-w-md text-center space-y-4">
            <h2 className="text-4xl font-bold">
              Secure Password Reset
            </h2>
            <p className="text-base opacity-90">
              Create a strong, secure password to protect your apartment management account.
            </p>
            <div className="mt-6 bg-white/10 rounded-lg p-4 flex items-center justify-center aspect-video">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white/70">Secure & Protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 