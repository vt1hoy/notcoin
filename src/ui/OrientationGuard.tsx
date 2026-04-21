import type { ReactNode } from 'react'
import { useLandscapeFirstMobile } from '../hooks/useLandscapeFirstMobile'
import { LandscapeHintBanner } from './LandscapeHintBanner'

export function OrientationGuard({ children }: { children: ReactNode }) {
  const { showLandscapeHint } = useLandscapeFirstMobile()

  return (
    <>
      {showLandscapeHint ? <LandscapeHintBanner /> : null}
      {children}
    </>
  )
}
