import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HRow, Sheet, TimePicker } from './ui'
import { useLocations, useServiceCategories, useWorshipLeaders, useCreateService, useServices } from '../lib/queries'
import type { CreateServiceInput } from '../lib/schemas'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { formatTimePL, timeKey, todayStr } from '../lib/dates'

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
  const { data: allServices = [] } = useServices()
  const createService = useCreateService()
  const [filterLocationId] = useLocationFilter()

  const [date, setDate] = useState(todayStr())
  // Godzina startuje PUSTA i nie ma wartości domyślnej — dwa nabożeństwa w
  // jednym dniu różni tylko ona, więc musi być świadomym wyborem.
  const [time, setTime] = useState<string | null>(null)
  const [locationId, setLocationId] = useState(filterLocationId ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [leaderId, setLeaderId] = useState(defaultLeaderId ?? '')

  // Zasiej domyślne wartości za każdym razem, gdy arkusz się otwiera —
  // leader i filtr lokalizacji ładują się asynchronicznie, więc inicjalizator
  // useState (uruchamiany tylko raz przy montażu) nie zawsze je złapie.
  useEffect(() => {
    if (!open) return
    setDate(todayStr())
    setTime(null)
    setCategoryId('')
    setLocationId(filterLocationId ?? '')
    setLeaderId(defaultLeaderId ?? '')
  }, [open, filterLocationId, defaultLeaderId])

  // Ten sam termin w tej samej lokalizacji jest fizycznie niemożliwy, więc
  // BLOKUJEMY zapis (unikalny indeks w bazie odrzuciłby go i tak — lepiej
  // powiedzieć to przed tapnięciem niż błędem po). Wcześniej ostrzegaliśmy przy
  // samej dacie + lokalizacji, co przy 11:00 i 19:00 tego samego dnia wyskakiwało
  // za każdym razem i uczyło klikać „Dodaj mimo to" bez czytania.
  const duplicate = time !== null && allServices.find(s =>
    s.date === date && s.location_id === locationId && timeKey(s.start_time) === timeKey(time),
  )

  const canCreate = !!(date && time && locationId && categoryId && !duplicate)

  const handleCreate = async () => {
    if (!canCreate || !time) return
    const id = await createService.mutateAsync({
      date,
      start_time: time,
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
      <input type="date" className="field" style={{ padding: '13px 14px', marginBottom: 18, WebkitAppearance: 'none' }}
        value={date} onChange={e => setDate(e.target.value)} />

      <div className="t-label" style={{ marginBottom: 8 }}>Godzina</div>
      <TimePicker value={time} onChange={setTime} />

      <div className="t-label" style={{ marginBottom: 8 }}>Lokalizacja</div>
      <HRow selected={locationId} style={{ marginBottom: 18 }}>
        {locations.map(l => (
          <button key={l.id} className={`tag${locationId === l.id ? ' include' : ''}`}
            data-selected={locationId === l.id ? 'true' : undefined}
            onClick={() => setLocationId(l.id)}>
            {l.name}
          </button>
        ))}
      </HRow>

      <div className="t-label" style={{ marginBottom: 8 }}>Kategoria</div>
      <HRow selected={categoryId} style={{ marginBottom: 18 }}>
        {categories.map(c => (
          <button key={c.id} className={`tag${categoryId === c.id ? ' include' : ''}`}
            data-selected={categoryId === c.id ? 'true' : undefined}
            onClick={() => setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
      </HRow>

      {/* Prowadzący jest opcjonalny — bywają nabożeństwa i uroczystości bez konkretnej
          osoby. Jawny kafelek „Brak" zamiast liczenia na to, że użytkownik domyśli się
          odklikania wstępnie wybranego prowadzącego. */}
      <div className="t-label" style={{ marginBottom: 8 }}>Prowadzący muzykę (opcjonalnie)</div>
      <HRow selected={leaderId} style={{ marginBottom: 24 }}>
        <button className={`tag${!leaderId ? ' include' : ''}`}
          data-selected={!leaderId ? 'true' : undefined}
          onClick={() => setLeaderId('')}>
          Brak
        </button>
        {leaders.map(l => (
          <button key={l.id} className={`tag${leaderId === l.id ? ' include' : ''}`}
            data-selected={leaderId === l.id ? 'true' : undefined}
            onClick={() => setLeaderId(id => id === l.id ? '' : l.id)}>
            {l.name}
          </button>
        ))}
      </HRow>

      {duplicate && (
        <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 14, lineHeight: 1.45 }}>
          W tej lokalizacji jest już nabożeństwo o {formatTimePL(duplicate.start_time)} tego dnia
          ({duplicate.category.name}). Zmień godzinę albo otwórz istniejące.
        </div>
      )}

      <button className="btn btn-primary btn-block"
        disabled={!canCreate || createService.isPending} onClick={handleCreate}>
        {createService.isPending ? 'Tworzenie…' : 'Utwórz i otwórz'}
      </button>
    </Sheet>
  )
}
