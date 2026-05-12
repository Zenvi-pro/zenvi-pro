'use client'

import React, { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
  scene: string
  className?: string
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense 
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#050505]">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      {/* Wrapper applying a customized matte banana yellow CSS filter without shiny highlights or external glows */}
      <div 
        className="w-full h-full relative flex items-center justify-center overflow-hidden"
        style={{
          filter: "sepia(1) saturate(3.5) hue-rotate(5deg) brightness(1.05) contrast(0.85)"
        }}
      >
        <Spline
          scene={scene}
          className={className}
        />
      </div>
    </Suspense>
  )
}
