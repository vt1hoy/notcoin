import type { ReactNode } from 'react'
import { useLandscapeFirstMobile } from '../hooks/useLandscapeFirstMobile'
import { PortraitOrientationOverlay } from './PortraitOrientationOverlay'

export function OrientationGuard({ children }: { children: ReactNode }) {
  const { shouldBlockForPortrait } = useLandscapeFirstMobile()

  if (shouldBlockForPortrait) {
    return <PortraitOrientationOverlay />
  }

  return <>{children}</>
}

