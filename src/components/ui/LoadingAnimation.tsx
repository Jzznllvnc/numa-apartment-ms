'use client'

import Lottie from 'lottie-react'
import loadingAnimationData from '../../../public/animations/loading-animation.json'

interface LoadingAnimationProps {
  size?: number
  message?: string
  className?: string
  animationData?: any
}

export default function LoadingAnimation({ 
  size = 120, 
  message = "Loading...", 
  className = "",
  animationData = loadingAnimationData
}: LoadingAnimationProps) {

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        style={{ 
          width: size, 
          height: size,
          backgroundColor: 'transparent'
        }}
      >
        <Lottie 
          animationData={animationData} 
          loop={true}
          autoplay={true}
          style={{
            background: 'transparent',
            backgroundColor: 'transparent'
          }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice',
            progressiveLoad: false
          }}
        />
      </div>
      {message && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-center">
          {message}
        </p>
      )}
    </div>
  )
}