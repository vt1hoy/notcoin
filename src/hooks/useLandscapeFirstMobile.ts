import { useEffect, useMemo, useState } from 'react'

type OrientationState = 'portrait' | 'landscape' | 'unknown'

function getOrientation(): OrientationState {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
    return 'unknown'
  }

  // Most stable option across modern mobile browsers.
  if (window.matchMedia('(orientation: portrait)').matches) return 'portrait'
  if (window.matchMedia('(orientation: landscape)').matches) return 'landscape'

  // Fallback for odd/embedded environments.
  if (typeof window.innerWidth === 'number' && typeof window.innerHeight === 'number') {
    return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape'
  }

  return 'unknown'
}

function getIsProbablyMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
    return false
  }

  // Pointer/hover signals are preferable to a UA sniff.
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches

  // Helps catch small tablets/phones in some browsers.
  const smallViewport =
    window.matchMedia('(max-width: 920px)').matches ||
    window.matchMedia('(max-height: 560px)').matches

  return coarsePointer || noHover || smallViewport
}

export function useLandscapeFirstMobile() {
  const isProbablyMobile = useMemo(getIsProbablyMobile, [])
  const [orientation, setOrientation] = useState<OrientationState>(() => getOrientation())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const portraitMql = window.matchMedia?.('(orientation: portrait)')
    const landscapeMql = window.matchMedia?.('(orientation: landscape)')

    const onChange = () => setOrientation(getOrientation())

    portraitMql?.addEventListener?.('change', onChange)
    landscapeMql?.addEventListener?.('change', onChange)
    window.addEventListener('resize', onChange, { passive: true })

    return () => {
      portraitMql?.removeEventListener?.('change', onChange)
      landscapeMql?.removeEventListener?.('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  /** True on coarse/small viewports in portrait — show soft hint only; never block play. */
  const showLandscapeHint = isProbablyMobile && orientation === 'portrait'

  return {
    isProbablyMobile,
    orientation,
    showLandscapeHint,
  }
}

