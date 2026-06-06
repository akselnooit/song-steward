import { useState } from 'react'
import { ChevronRight, Lock } from 'lucide-react'

interface CatBlockProps {
  name: string
  selectedCount?: number
  defaultOpen?: boolean
  locked?: boolean
  children: React.ReactNode
}

export function CatBlock({ name, selectedCount, defaultOpen = false, locked, children }: CatBlockProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="cat-block">
      <div className="cat-head" onClick={() => setOpen(o => !o)}>
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
