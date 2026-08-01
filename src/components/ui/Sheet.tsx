import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { inHorizontalScroller, isEditableTarget } from '../../lib/gestures'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

// Stos otwartych arkuszy — gdy jeden jest otwarty nad drugim (np. gra nad
// podziękowaniem), Escape ma zamykać tylko wierzchni, nie oba naraz.
const openStack: symbol[] = []

export function Sheet({ open, onClose, children }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const idRef = useRef(Symbol('sheet'))

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    openStack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === id) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = openStack.indexOf(id)
      if (i !== -1) openStack.splice(i, 1)
    }
  }, [open])

  // Pull-down-to-close gesture (only when the body is scrolled to the top).
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !open) return
    let startX = 0, startY = 0, startScrollTop = 0
    let dragging = false, decided = false, ignore = false

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startScrollTop = bodyRef.current?.scrollTop ?? 0
      dragging = false
      decided = false
      // Gest zaczęty na poziomym pasku chipów albo w polu tekstowym nigdy nie
      // ciągnie arkusza — wcześniej przewijanie chipów w bok ciągnęło arkusz
      // w dół (wystarczyło minimalne zejście palcem) i zamykało edycję.
      ignore = inHorizontalScroller(e.target, sheet) || isEditableTarget(e.target)
      sheet.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      if (ignore) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      // Oś gestu rozstrzygamy raz, po przekroczeniu progu — gest poziomy
      // oddajemy przeglądarce (natywne przewijanie), nie porywamy go na drag.
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        decided = true
        if (Math.abs(dx) > Math.abs(dy)) { ignore = true; return }
      }
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
