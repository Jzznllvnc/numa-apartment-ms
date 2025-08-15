'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Oleo_Script } from 'next/font/google'

const oleoScript = Oleo_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
})

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password reset email sent! Please check your inbox and spam folder.')
      setEmail('')
    } catch (err) {
      console.error('Reset password error:', err)
      setError('An unexpected error occurred. Please try again.')
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
        <h1 className={`text-4xl font-bold text-gray-900 ${oleoScript.className}`}>
          Numa
        </h1>
      </div>

      {/* Copyright - Bottom Left */}
      <div className="absolute bottom-6 left-6 text-xs text-gray-500 z-10">
        Copyright © 2025 Numa Enterprises LTD.
      </div>

      {/* Left Side - Forgot Password Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Your Password?</h2>
            <p className="text-gray-600">
              Enter your email address and we&apos;ll send you a link to reset your password.
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

          {/* Reset Password Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email address"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Sending Reset Email...' : 'Send Reset Email'}
            </button>
          </form>

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
              Secure Password Recovery
            </h2>
            <p className="text-base opacity-90">
              We&apos;ll help you regain access to your apartment management dashboard safely and securely.
            </p>
            <div className="mt-6 bg-white/10 rounded-lg p-4 flex items-center justify-center aspect-video">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0115 7z" />
                  </svg>
                </div>
                <p className="text-white/70">Secure Recovery Process</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 