import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, User, Trash2 } from 'lucide-react'
import { LocationChip } from '../components/ui'
import { NewServiceSheet } from '../components/NewServiceSheet'
import { useServices, useLocations, useDeleteService } from '../lib/queries'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useLocationFilter } from '../hooks/useLocationFilter'
import type { ServiceWithRefs } from '../lib/types'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDatePL(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function ServiceCard({ service, isToday, onClick, onDelete }: {
  service: ServiceWithRefs; isToday: boolean; onClick: () => void; onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming) { onDelete(); setConfirming(false) }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 3000) }
  }

  return (
    <div className="card" style={{ padding: '14px 16px', cursor: 'pointer', marginBottom: 10, position: 'relative' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isToday && (
          <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-pill)' }}>
            DZIŚ
          </span>
        )}
        <span className="count-line">{formatDatePL(service.date)}</span>
        <button
          style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 'var(--r-sm)', border: '1px solid', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all .15s', background: confirming ? 'var(--danger-soft)' : 'var(--surface-2)', color: confirming ? 'var(--danger)' : 'var(--text-3)', borderColor: confirming ? 'var(--danger-bd)' : 'var(--border)' }}
          onClick={handleDelete}
          title={confirming ? 'Kliknij ponownie, aby potwierdzić' : 'Usuń nabożeństwo'}
        >
          <Trash2 size={15} strokeWidth={1.7} />
        </button>
      </div>
      <div className="t-title" style={{ fontSize: 17, marginBottom: 6 }}>
        {service.category.name} · {service.location.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 13 }}>
        <User size={13} strokeWidth={1.7} />
        {service.leader?.name ?? '—'}
      </div>
      {confirming && (
        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>
          Kliknij kosz jeszcze raz, aby usunąć
        </div>
      )}
    </div>
  )
}

export function Services() {
  const navigate = useNavigate()
  const { leader } = useCurrentUser()
  const [locationId] = useLocationFilter()
  const [newOpen, setNewOpen] = useState(false)

  const { data: services = [] } = useServices(locationId)
  const { data: locations = [] } = useLocations()
  const deleteService = useDeleteService()

  const today = todayStr()
  const locationName = locations.find(l => l.id === locationId)?.name

  return (
    <div className="screen">
      <div className="app-header">
        <h1>Nabożeństwa</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LocationChip value={locationName} onClick={() => navigate('/settings')} />
          <button className="icon-btn" onClick={() => setNewOpen(true)}>
            <Plus size={20} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <div className="screen-pad">
        {services.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: 14 }}>
            {locationId ? `Brak nabożeństw w lokalizacji ${locationName}` : 'Brak nabożeństw'}
          </div>
        ) : (
          services.map(s => (
            <ServiceCard
              key={s.id}
              service={s}
              isToday={s.date === today}
              onClick={() => navigate(`/live/${s.id}`)}
              onDelete={() => deleteService.mutate(s.id)}
            />
          ))
        )}
        {locationId && (
          <div className="hint" style={{ justifyContent: 'center', marginTop: 8 }}>
            Pokazano nabożeństwa w: {locationName}
          </div>
        )}
      </div>

      <NewServiceSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        defaultLeaderId={leader?.id}
      />
    </div>
  )
}
