import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from './ui'
import { useLocations, useServiceCategories, useWorshipLeaders, useCreateService } from '../lib/queries'
import type { CreateServiceInput } from '../lib/schemas'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface NewServiceSheetProps {
  open: boolean
  onClose: () => void
  defaultLeaderId?: string
}

export function NewServiceSheet({ open, onClose, defaultLeaderId }: NewServiceSheetProps) {
  const navigate = useNavigate()
  const { data: locations = [] } = useLocations()
  const { data: categories = [] } = useServiceCategories()
  const { data: leaders = [] } = useWorshipLeaders()
  const createService = useCreateService()

  const [date, setDate] = useState(todayStr())
  const [locationId, setLocationId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [leaderId, setLeaderId] = useState(defaultLeaderId ?? '')

  const canCreate = date && locationId && categoryId

  const handleCreate = async () => {
    if (!canCreate) return
    const id = await createService.mutateAsync({
      date,
      location_id: locationId,
      category_id: categoryId,
      worship_leader_id: leaderId || null,
      notes: null,
    } as CreateServiceInput)
    onClose()
    navigate(`/live/${id}`)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="t-title" style={{ fontSize: 20, marginBottom: 20 }}>Nowe nabożeństwo</div>

      <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Data</label>
      <input type="date" className="field" style={{ padding: '13px 14px', marginBottom: 18 }}
        value={date} onChange={e => setDate(e.target.value)} />

      <div className="t-label" style={{ marginBottom: 8 }}>Lokalizacja</div>
      <div className="hrow" style={{ marginBottom: 18 }}>
        {locations.map(l => (
          <button key={l.id} className={`tag${locationId === l.id ? ' include' : ''}`} onClick={() => setLocationId(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      <div className="t-label" style={{ marginBottom: 8 }}>Kategoria</div>
      <div className="hrow" style={{ marginBottom: 18 }}>
        {categories.map(c => (
          <button key={c.id} className={`tag${categoryId === c.id ? ' include' : ''}`} onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="t-label" style={{ marginBottom: 8 }}>Prowadzący</div>
      <div className="hrow" style={{ marginBottom: 24 }}>
        {leaders.map(l => (
          <button key={l.id} className={`tag${leaderId === l.id ? ' include' : ''}`} onClick={() => setLeaderId(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      <button className="btn btn-primary btn-block"
        disabled={!canCreate || createService.isPending} onClick={handleCreate}>
        {createService.isPending ? 'Tworzenie…' : 'Utwórz i otwórz'}
      </button>
    </Sheet>
  )
}
