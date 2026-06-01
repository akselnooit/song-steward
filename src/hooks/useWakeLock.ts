import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {}
    }

    request()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      lock?.release()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
