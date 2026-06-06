import { useState } from 'react'
import { ChevronRight, Lock } from 'lucide-react'

interface CatBlockProps {
  name: string
  selectedCount?: number
  defaultOpen?: boolean
  locked?: boolean
  /** Controlled open state. When provided (with onToggle), the parent owns open/close — used for single-open accordions. */
  open?: boolean
  onToggle?: () => void
  children: React.ReactNode
}

export function CatBlock({ name, selectedCount, defaultOpen = false, locked, open: openProp, onToggle, children }: CatBlockProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const toggle = () => { if (isControlled) onToggle?.(); else setInternalOpen(o => !o) }

  return (
    <div className="cat-block">
      <div className="cat-head" onClick={toggle}>
        <span className="name">
          {name}
          {locked && <Lock size={13} />}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedCount != null && selectedCount > 0 && (
            <span className="badge-col">{selectedCount}</span>
          )}
          <ChevronRight size={16} strokeWidth={1.7} className={`chev${open ? ' open' : ''}`} />
        </span>
      </div>
      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {children}
        </div>
      )}
    </div>
  )
}
