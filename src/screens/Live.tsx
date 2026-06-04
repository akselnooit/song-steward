import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, Check, X, Search, Tag, Pencil, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MetaChip, Sheet } from '../components/ui'
import { useWakeLock } from '../hooks/useWakeLock'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import {
  useService, useServiceSongs,
  useAddServiceSong, useUpdateServiceSong, useRemoveServiceSong, useUpdateServiceNotes,
  useUpdateService, useLocations, useServiceCategories, useWorshipLeaders,
} from '../lib/queries'
import { useAllSongsForSearch } from '../lib/queries/songs'
import type { ServiceSongWithSong, ServiceWithRefs } from '../lib/types'

function formatDatePL(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Edit service sheet ───────────────────────────────────────────

function EditServiceSheet({ service, open, onClose }: {
  service: ServiceWithRefs; open: boolean; onClose: () => void
}) {
  const { data: locations = [] } = useLocations()
  const { data: categories = [] } = useServiceCategories()
  const { data: leaders = [] } = useWorshipLeaders()
  const updateService = useUpdateService()

  const [date, setDate] = useState(service.date)
  const [locationId, setLocationId] = useState(service.location_id)
  const [categoryId, setCategoryId] = useState(service.category_id)
  const [leaderId, setLeaderId] = useState(service.worship_leader_id ?? '')

  useEffect(() => {
    if (open) {
      setDate(service.date)
      setLocationId(service.location_id)
      setCategoryId(service.category_id)
      setLeaderId(service.worship_leader_id ?? '')
    }
  }, [open, service])

  const canSave = date && locationId && categoryId

  const handleSave = async () => {
    if (!canSave) return
    await updateService.mutateAsync({
      id: service.id,
      date,
      location_id: locationId,
      category_id: categoryId,
      worship_leader_id: leaderId || null,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="t-title" style={{ fontSize: 20, marginBottom: 20 }}>Edytuj nabożeństwo</div>

      <label className="t-label" style={{ display: 'block', marginBottom: 8 }}>Data</label>
      <input type="date" className="field"
        style={{ padding: '13px 14px', marginBottom: 18 }}
        value={date} onChange={e => setDate(e.target.value)} />

      <div className="t-label" style={{ marginBottom: 8 }}>Lokalizacja</div>
      <div className="hrow" style={{ marginBottom: 18 }}>
        {locations.map(l => (
          <button key={l.id} className={`tag${locationId === l.id ? ' include' : ''}`}
            onClick={() => setLocationId(l.id)}>{l.name}</button>
        ))}
      </div>

      <div className="t-label" style={{ marginBottom: 8 }}>Kategoria</div>
      <div className="hrow" style={{ marginBottom: 18 }}>
        {categories.map(c => (
          <button key={c.id} className={`tag${categoryId === c.id ? ' include' : ''}`}
            onClick={() => setCategoryId(c.id)}>{c.name}</button>
        ))}
      </div>

      <div className="t-label" style={{ marginBottom: 8 }}>Prowadzący</div>
      <div className="hrow" style={{ marginBottom: 24 }}>
        {leaders.map(l => (
          <button key={l.id} className={`tag${leaderId === l.id ? ' include' : ''}`}
            onClick={() => setLeaderId(id => id === l.id ? '' : l.id)}>{l.name}</button>
        ))}
      </div>

      <button className="btn btn-primary btn-block"
        disabled={!canSave || updateService.isPending}
        onClick={handleSave}>
        {updateService.isPending ? 'Zapisuję…' : 'Zapisz zmiany'}
      </button>
    </Sheet>
  )
}

// ── Sortable service song row ────────────────────────────────────

function SortableRow({ ss, rank, onOpen, onPromote, onRemove }: {
  ss: ServiceSongWithSong; rank?: number
  onOpen: () => void; onPromote?: () => void; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ss.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: 8,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="svc-song">
        <span className="drag-h" {...attributes} {...listeners} style={{ touchAction: 'none' }}>
          <GripVertical size={18} strokeWidth={1.7} />
        </span>
        {rank != null && <span className="rank">{rank}</span>}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
          <span className="badge-col" style={{ fontSize: 10 }}>
            {ss.song.collection.short_name} {ss.song.number}
          </span>
          <div className="t-title" style={{ fontSize: 15, marginTop: 4, lineHeight: 1.15 }}>
            {ss.song.title}
          </div>
        </div>
        {onPromote && (
          <button className="mini-btn good" onClick={onPromote}>
            <Check size={16} strokeWidth={1.7} />
          </button>
        )}
        <button className="mini-btn" onClick={onRemove}>
          <X size={16} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  )
}

// ── Live screen ──────────────────────────────────────────────────

export function Live() {
  const { id: serviceId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { openSong } = useSongOverlay()
  useWakeLock()

  const navServiceIds: string[] = (location.state as any)?.navServiceIds ?? []
  const navIdx = navServiceIds.indexOf(serviceId ?? '')
  const canGoPrevSvc = navIdx > 0
  const canGoNextSvc = navIdx >= 0 && navIdx < navServiceIds.length - 1

  const screenRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const screen = screenRef.current
    if (!screen || navServiceIds.length === 0) return
    let startX = 0, startY = 0, decided = false, dir: 'h' | 'v' | null = null

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      decided = false; dir = null
    }
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (!decided && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        decided = true
        dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (dir === 'h') e.preventDefault()
    }
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX
      if (dir !== 'h') return
      if (dx < -60 && canGoNextSvc) {
        navigate(`/live/${navServiceIds[navIdx + 1]}`, { state: location.state })
      } else if (dx > 60 && canGoPrevSvc) {
        navigate(`/live/${navServiceIds[navIdx - 1]}`, { state: location.state })
      }
    }

    screen.addEventListener('touchstart', onStart, { passive: false })
    screen.addEventListener('touchmove', onMove, { passive: false })
    screen.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      screen.removeEventListener('touchstart', onStart)
      screen.removeEventListener('touchmove', onMove)
      screen.removeEventListener('touchend', onEnd)
    }
  }, [serviceId, navServiceIds, navIdx, canGoPrevSvc, canGoNextSvc, navigate, location.state])

  const { data: service } = useService(serviceId ?? null)
  const { data: serviceSongs = [] } = useServiceSongs(serviceId ?? null)
  const { data: allSongs = [] } = useAllSongsForSearch()

  const addServiceSong = useAddServiceSong()
  const updateServiceSong = useUpdateServiceSong()
  const removeServiceSong = useRemoveServiceSong()
  const updateNotes = useUpdateServiceNotes()

  const [searchQ, setSearchQ] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState(service?.notes ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setNotes(service?.notes ?? '') }, [service?.notes])

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  const planned = useMemo(
    () => serviceSongs.filter(ss => ss.status === 'planned').sort((a, b) => (a.song_order ?? 999) - (b.song_order ?? 999)),
    [serviceSongs]
  )
  const sung = useMemo(
    () => serviceSongs.filter(ss => ss.status === 'sung').sort((a, b) => (a.song_order ?? 999) - (b.song_order ?? 999)),
    [serviceSongs]
  )

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return []
    const q = searchQ.toLowerCase()
    return allSongs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      String(s.number).includes(q) ||
      (s.author ?? '').toLowerCase().includes(q)
    ).slice(0, 4)
  }, [allSongs, searchQ])

  const handleAddSong = async (songId: string, status: 'planned' | 'sung') => {
    const maxOrder = planned.reduce((m, ss) => Math.max(m, ss.song_order ?? 0), -1)
    await addServiceSong.mutateAsync({
      service_id: serviceId!,
      song_id: songId,
      status,
      song_order: status === 'planned' ? maxOrder + 1 : null,
    })
    setSearchQ('')
    showToast(status === 'sung' ? 'Dodano do zaśpiewanych' : 'Dodano do zaplanowanych')
  }

  const handlePromote = async (ss: ServiceSongWithSong) => {
    await updateServiceSong.mutateAsync({ id: ss.id, service_id: serviceId!, status: 'sung', song_order: sung.length })
    showToast('Oznaczono jako zaśpiewaną')
  }

  const handleRemove = (ss: ServiceSongWithSong) => {
    removeServiceSong.mutate({ id: ss.id, service_id: serviceId! })
  }

  const handleSaveNotes = () => {
    setEditingNotes(false)
    if (notes !== (service?.notes ?? '')) {
      updateNotes.mutate({ id: serviceId!, notes })
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 8 } }),
  )

  const handleDragStart = () => { navigator.vibrate?.(30) }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = planned.findIndex(ss => ss.id === active.id)
    const newIdx = planned.findIndex(ss => ss.id === over.id)
    const reordered = arrayMove(planned, oldIdx, newIdx)
    reordered.forEach((ss, i) => {
      if (ss.song_order !== i) {
        updateServiceSong.mutate({ id: ss.id, service_id: serviceId!, song_order: i })
      }
    })
  }

  const handleSungDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sung.findIndex(ss => ss.id === active.id)
    const newIdx = sung.findIndex(ss => ss.id === over.id)
    const reordered = arrayMove(sung, oldIdx, newIdx)
    reordered.forEach((ss, i) => {
      if (ss.song_order !== i) {
        updateServiceSong.mutate({ id: ss.id, service_id: serviceId!, song_order: i })
      }
    })
  }

  const today = todayStr()
  const isToday = service?.date === today
  const allSongIds = [...planned, ...sung].map(ss => ss.song.id)

  return (
    <div className="screen" style={{ paddingTop: 0 }} ref={screenRef}>
      {/* header */}
      <div style={{ padding: '52px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={19} strokeWidth={1.7} />
          </button>
          {isToday && (
            <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              DZIŚ
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="icon-btn" onClick={() => setEditOpen(true)}>
              <Pencil size={17} strokeWidth={1.7} />
            </button>
            {navServiceIds.length > 1 && (
              <>
                <button className="icon-btn" disabled={!canGoPrevSvc}
                  style={{ opacity: canGoPrevSvc ? 1 : 0.3 }}
                  onClick={() => canGoPrevSvc && navigate(`/live/${navServiceIds[navIdx - 1]}`, { state: location.state })}>
                  <ArrowLeft size={17} strokeWidth={1.7} />
                </button>
                <button className="icon-btn" disabled={!canGoNextSvc}
                  style={{ opacity: canGoNextSvc ? 1 : 0.3 }}
                  onClick={() => canGoNextSvc && navigate(`/live/${navServiceIds[navIdx + 1]}`, { state: location.state })}>
                  <ArrowRight size={17} strokeWidth={1.7} />
                </button>
              </>
            )}
          </div>
        </div>
        <h1 className="t-title" style={{ fontSize: 27, margin: '0 0 10px' }}>
          {service?.category.name ?? '…'}
        </h1>
        <div className="svc-meta">
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>{formatDatePL(service?.date ?? '')}</MetaChip>
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>{service?.location.name}</MetaChip>
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>{service?.leader?.name ?? '—'}</MetaChip>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 16 }}>
        {/* notes */}
        <div className="t-label" style={{ marginBottom: 7 }}>Notatki</div>
        {editingNotes ? (
          <textarea
            className="notes-box"
            autoFocus
            value={notes}
            rows={3}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            onKeyDown={e => { if (e.key === 'Escape') handleSaveNotes() }}
          />
        ) : (
          <div
            className="notes-box"
            style={{ cursor: 'text', minHeight: 46, color: notes ? 'var(--text-2)' : 'var(--text-3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}
            onClick={() => setEditingNotes(true)}
          >
            <Pencil size={15} strokeWidth={1.7} style={{ marginTop: 3, flexShrink: 0, opacity: 0.6 }} />
            {notes || 'Dotknij, aby dodać notatkę…'}
          </div>
        )}

        {/* song search */}
        <div style={{ marginTop: 18 }}>
          <div className="field-wrap">
            <span className="field-ico"><Search size={18} strokeWidth={1.7} /></span>
            <input
              className="field"
              placeholder="Dodaj pieśń: tytuł lub numer"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoComplete="off"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="card list-rows fin" style={{ marginTop: 8 }}>
              {searchResults.map(s => (
                <div key={s.id} className="song-card" style={{ padding: '10px 12px' }}>
                  <span className="badge-col" style={{ fontSize: 10 }}>{s.collection.short_name} {s.number}</span>
                  <div className="meta">
                    <div className="title" style={{ fontSize: 14 }}>{s.title}</div>
                  </div>
                  <button className="mini-btn" onClick={() => handleAddSong(s.id, 'planned')}>
                    <Bookmark size={15} strokeWidth={1.7} />
                  </button>
                  <button className="mini-btn good" onClick={() => handleAddSong(s.id, 'sung')}>
                    <Check size={15} strokeWidth={1.7} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 10 }}
            onClick={() => navigate('/search')}
          >
            <Tag size={17} strokeWidth={1.7} /> Szukaj po tagach
          </button>
        </div>

        {/* planned */}
        <div className="sec-h" style={{ marginBottom: 10 }}>
          <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bookmark size={14} strokeWidth={1.7} /> Zaplanowane · {planned.length}
          </div>
        </div>
        {planned.length === 0 ? (
          <div className="hint" style={{ padding: '4px 2px 8px' }}>Brak zaplanowanych pieśni</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={planned.map(ss => ss.id)} strategy={verticalListSortingStrategy}>
              {planned.map(ss => (
                <SortableRow
                  key={ss.id}
                  ss={ss}
                  onOpen={() => openSong(ss.song.id, allSongIds)}
                  onPromote={() => handlePromote(ss)}
                  onRemove={() => handleRemove(ss)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* sung */}
        <div className="sec-h" style={{ marginBottom: 10 }}>
          <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Check size={14} strokeWidth={1.7} /> Zaśpiewane · {sung.length}
          </div>
        </div>
        {sung.length === 0 ? (
          <div className="hint" style={{ padding: '4px 2px' }}>Jeszcze nic nie zaśpiewano</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={handleDragStart} onDragEnd={handleSungDragEnd}>
            <SortableContext items={sung.map(ss => ss.id)} strategy={verticalListSortingStrategy}>
              {sung.map((ss, i) => (
                <SortableRow
                  key={ss.id}
                  ss={ss}
                  rank={i + 1}
                  onOpen={() => openSong(ss.song.id, allSongIds)}
                  onRemove={() => handleRemove(ss)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {toast && (
        <div className="saved-toast fin">
          <Check size={15} strokeWidth={1.7} /> {toast}
        </div>
      )}

      {service && (
        <EditServiceSheet service={service} open={editOpen} onClose={() => setEditOpen(false)} />
      )}
    </div>
  )
}
