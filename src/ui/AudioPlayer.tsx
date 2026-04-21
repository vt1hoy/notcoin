import { useEffect, useRef } from 'react'

type Props = {
  enabled: boolean
}

export function AudioPlayer({ enabled }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = 0.25
    if (enabled) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [enabled])

  return (
    <audio
      ref={audioRef}
      src="/audio/track.mp3"
      loop
      preload="auto"
    />
  )
}
