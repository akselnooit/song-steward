import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Sheet({ open, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-grab" />
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.getElementById('root')!,
  )
}
