import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 80 // px do zjechania żeby wywołać odświeżenie

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const startY = useRef(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY
    }

    const onTouchEnd = async (e: TouchEvent) => {
      if (refreshing) return
      const dy = e.changedTouches[0].clientY - startY.current
      // Tylko gdy użytkownik jest na górze strony i ściągnął wystarczająco
      if (dy > THRESHOLD && window.scrollY === 0) {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, refreshing])

  return { refreshing }
}
