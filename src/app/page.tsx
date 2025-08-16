'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingAnimation from '@/components/ui/LoadingAnimation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingAnimation 
        size={120} 
        message="Redirecting to login..." 
      />
    </div>
  )
}
