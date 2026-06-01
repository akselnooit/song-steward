import { useRef } from 'react'

export function useLongPress(onClick?: () => void, onLong?: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(() => {
        fired.current = true
        onLong?.()
      }, ms)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return
      const d = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y)
      if (d > 8) clear()
    },
    onPointerUp: () => {
      clear()
      if (!fired.current) onClick?.()
      start.current = null
    },
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLong?.()
    },
  }
}
