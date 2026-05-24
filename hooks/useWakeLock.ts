import { useEffect, useRef } from 'react'

export function useWakeLock(enabled = true) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  async function acquire() {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        lockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      // silent degradation
    }
  }

  async function release() {
    try {
      await lockRef.current?.release()
      lockRef.current = null
    } catch {
      // silent degradation
    }
  }

  useEffect(() => {
    if (!enabled) {
      release()
      return
    }

    acquire()

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        acquire()
      } else {
        release()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      release()
    }
  }, [enabled])
}
