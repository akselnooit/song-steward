import { useCallback, useEffect, useRef, useState } from 'react'

type MotionWithPermission = { requestPermission?: () => Promise<'granted' | 'denied' | 'default'> }

// Wykrywanie potrząśnięcia telefonem (devicemotion) z obsługą zgody iOS 13+.
// iOS wymaga, by DeviceMotionEvent.requestPermission() było wołane z gestu użytkownika
// (tap) i po HTTPS — dlatego `enable()` należy wywołać w handlerze tapnięcia.
export function useShake(onShake: () => void) {
  const [enabled, setEnabled] = useState(false)
  const onShakeRef = useRef(onShake)
  onShakeRef.current = onShake
  const lastRef = useRef(0)

  const needsPermission =
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof (DeviceMotionEvent as unknown as MotionWithPermission).requestPermission === 'function'

  // Włącz nasłuch. Na iOS 13+ najpierw prosi o zgodę (musi lecieć z gestu użytkownika).
  // Zwraca true, gdy nasłuch aktywny. Na desktopie/braku wsparcia zwraca false.
  const enable = useCallback(async (): Promise<boolean> => {
    if (typeof DeviceMotionEvent === 'undefined') return false
    if (needsPermission) {
      try {
        const res = await (DeviceMotionEvent as unknown as MotionWithPermission).requestPermission!()
        if (res !== 'granted') return false
      } catch {
        return false
      }
    }
    setEnabled(true)
    return true
  }, [needsPermission])

  useEffect(() => {
    if (!enabled) return
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      // magnituda z grawitacją: ~9.8 w spoczynku, potrząśnięcie daje wyraźny skok
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2)
      const now = Date.now()
      if (mag > 24 && now - lastRef.current > 800) { // próg siły + debounce
        lastRef.current = now
        onShakeRef.current()
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion) // sprzątanie przy unmount/disable
  }, [enabled])

  return { enabled, enable, needsPermission }
}
