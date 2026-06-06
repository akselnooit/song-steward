import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Sheet({ open, onClose, children }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Pull-down-to-close gesture (only when the body is scrolled to the top).
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !open) return
    let startY = 0, startScrollTop = 0, dragging = false

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startScrollTop = bodyRef.current?.scrollTop ?? 0
      dragging = false
      sheet.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY
      if (dy > 0 && startScrollTop === 0) {
        dragging = true
        e.preventDefault()
        sheet.style.transform = `translateY(${dy}px)`
      }
    }
    const onEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY
      sheet.style.transition = ''
      sheet.style.transform = ''
      if (dragging && dy > 80 && startScrollTop === 0) onCloseRef.current()
    }
    sheet.addEventListener('touchstart', onStart, { passive: true })
    sheet.addEventListener('touchmove', onMove, { passive: false })
    sheet.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      sheet.removeEventListener('touchstart', onStart)
      sheet.removeEventListener('touchmove', onMove)
      sheet.removeEventListener('touchend', onEnd)
      sheet.style.transform = ''
      sheet.style.transition = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" ref={sheetRef}>
        <div className="sheet-grab" />
        <div className="sheet-body" ref={bodyRef}>{children}</div>
      </div>
    </>,
    document.getElementById('root')!,
  )
}
