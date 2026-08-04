import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, Check, X, Search, Tag, Pencil, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HRow, MetaChip, Sheet, TimePicker } from '../components/ui'
import { NotesStatus } from '../components/NotesStatus'
import { NotesEditor } from '../components/NotesEditor'
import { useWakeLock } from '../hooks/useWakeLock'
import { useNotesAutosave } from '../hooks/useNotesAutosave'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import {
  useService, useServiceSongs,
  useAddServiceSong, useMarkSongSung, useUpdateServiceSong, useRemoveServiceSong,
  useUpdateService, useLocations, useServiceCategories, useWorshipLeaders, useServices,
} from '../lib/queries'
import { useAllSongsForSearch } from '../lib/queries/songs'
import type { ServiceSongWithSong, ServiceWithRefs } from '../lib/types'
import { collectionClass, compareSongs } from '../lib/utils'
import { inHorizontalScroller, isEditableTarget } from '../lib/gestures'
import { formatDateWithYearPL, formatTimePL, timeKey, todayStr } from '../lib/dates'

// ── Edit service sheet ───────────────────────────────────────────

function EditServiceSheet({ service, open, onClose }: {
  service: ServiceWithRefs; open: boolean; onClose: () => void
}) {
  const { data: locations = [] } = useLocations()
  const { data: categories = [] } = useServiceCategories()
  const { data: leaders = [] } = useWorshipLeaders()
  const { data: allServices = [] } = useServices()
  const updateService = useUpdateService()

  // Godzina istniejącego nabożeństwa przychodzi z bazy jako „19:00:00" — TimePicker
  // i walidacja operują na „HH:MM", więc obcinamy sekundy raz, tutaj.
  const [date, setDate] = useState(service.date)
  const [time, setTime] = useState<string | null>(timeKey(service.start_time))
  const [locationId, setLocationId] = useState(service.location_id)
  const [categoryId, setCategoryId] = useState(service.category_id)
  const [leaderId, setLeaderId] = useState(service.worship_leader_id ?? '')

  useEffect(() => {
    if (open) {
      setDate(service.date)
      setTime(timeKey(service.start_time))
      setLocationId(service.location_id)
      setCategoryId(service.category_id)
      setLeaderId(service.worship_leader_id ?? '')
    }
  }, [open, service])

  // Ta sama blokada, co przy tworzeniu — z pominięciem samego siebie, żeby zapis
  // bez zmiany terminu nie zgłaszał kolizji z własnym wpisem.
  const duplicate = time !== null && allServices.find(s =>
    s.id !== service.id && s.date === date && s.location_id === locationId
    && timeKey(s.start_time) === timeKey(time),
  )

  const canSave = !!(date && time && locationId && categoryId && !duplicate)

  const handleSave = async () => {
    if (!canSave || !time) return
    await updateService.mutateAsync({
      id: service.id,
      date,
      start_time: time,
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

      <div className="t-label" style={{ marginBottom: 8 }}>Godzina</div>
      <TimePicker value={time} onChange={setTime} />

      <div className="t-label" style={{ marginBottom: 8 }}>Lokalizacja</div>
      <HRow selected={locationId} style={{ marginBottom: 18 }}>
        {locations.map(l => (
          <button key={l.id} className={`tag${locationId === l.id ? ' include' : ''}`}
            data-selected={locationId === l.id ? 'true' : undefined}
            onClick={() => setLocationId(l.id)}>{l.name}</button>
        ))}
      </HRow>

      <div className="t-label" style={{ marginBottom: 8 }}>Kategoria</div>
      <HRow selected={categoryId} style={{ marginBottom: 18 }}>
        {categories.map(c => (
          <button key={c.id} className={`tag${categoryId === c.id ? ' include' : ''}`}
            data-selected={categoryId === c.id ? 'true' : undefined}
            onClick={() => setCategoryId(c.id)}>{c.name}</button>
        ))}
      </HRow>

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
            onClick={() => setLeaderId(id => id === l.id ? '' : l.id)}>{l.name}</button>
        ))}
      </HRow>

      {duplicate && (
        <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 14, lineHeight: 1.45 }}>
          W tej lokalizacji jest już nabożeństwo o {formatTimePL(duplicate.start_time)} tego dnia
          ({duplicate.category.name}).
        </div>
      )}

      <button className="btn btn-primary btn-block"
        disabled={!canSave || updateService.isPending}
        onClick={handleSave}>
        {updateService.isPending ? 'Zapisuję…' : 'Zapisz zmiany'}
      </button>
    </Sheet>
  )
}

// ── Sortable service song row ────────────────────────────────────

function SortableRow({ ss, rank, onOpen, onPromote, onRemove, flash, leaving }: {
  ss: ServiceSongWithSong; rank?: number
  onOpen: () => void; onPromote?: () => void; onRemove: () => void
  flash?: boolean; leaving?: boolean
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
      <div className={`svc-song${flash ? ' drop-in' : ''}${leaving ? ' leaving' : ''}`}>
        <span className="drag-h" {...attributes} {...listeners} style={{ touchAction: 'none' }}>
          <GripVertical size={18} strokeWidth={1.7} />
        </span>
        {rank != null && <span className="rank">{rank}</span>}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
          <span className={`badge-col ${collectionClass(ss.song.collection.short_name)}`} style={{ fontSize: 10 }}>
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
  useWakeLock(true)

  const navServiceIds: string[] = (location.state as any)?.navServiceIds ?? []
  const navIdx = navServiceIds.indexOf(serviceId ?? '')
  const canGoPrevSvc = navIdx > 0
  const canGoNextSvc = navIdx >= 0 && navIdx < navServiceIds.length - 1

  const screenRef = useRef<HTMLDivElement>(null)

  const { data: service } = useService(serviceId ?? null)
  const { data: serviceSongs = [] } = useServiceSongs(serviceId ?? null)
  const { data: allSongs = [] } = useAllSongsForSearch()

  const addServiceSong = useAddServiceSong()
  const markSongSung = useMarkSongSung()
  const updateServiceSong = useUpdateServiceSong()
  const removeServiceSong = useRemoveServiceSong()

  const [searchQ, setSearchQ] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [pendingSung, setPendingSung] = useState<
    | { kind: 'add'; songId: string }
    | { kind: 'promote'; ss: ServiceSongWithSong }
    | null
  >(null)
  const [shakePlannedId, setShakePlannedId] = useState<string | null>(null)
  const [justSungId, setJustSungId] = useState<string | null>(null)   // pieśń, która ma zagrać „drop-in" w zaśpiewanych
  const [leavingId, setLeavingId] = useState<string | null>(null)      // wiersz zaplanowanej „odlatujący" przy awansie
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cały cykl życia notatki — stan pola, autozapis co kilka sekund, ponowienia
  // i szkic w localStorage — siedzi w jednym haku.
  const {
    value: notes, change: changeNotes, state: notesState, flush: flushNotes, retry: retryNotes,
  } = useNotesAutosave(serviceId ?? null, service?.notes ?? undefined, editingNotes)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  const planned = useMemo(
    () => serviceSongs.filter(ss => ss.status === 'planned').sort((a, b) => (a.song_order ?? 999) - (b.song_order ?? 999)),
    [serviceSongs]
  )
  // null → -1 (najniższy), żeby ewentualne stare wpisy z null trafiały na DÓŁ (rank 1),
  // a nie „przyklejały się" na górze i nie spychały świeżo zaśpiewanych.
  const sung = useMemo(
    () => serviceSongs.filter(ss => ss.status === 'sung').sort((a, b) => (a.song_order ?? -1) - (b.song_order ?? -1)),
    [serviceSongs]
  )
  const sungReversed = useMemo(() => [...sung].reverse(), [sung])

  const searchResults = useMemo(() => {
    if (!searchQ.trim()) return []
    const q = searchQ.toLowerCase()
    return allSongs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      String(s.number).includes(q) ||
      (s.author ?? '').toLowerCase().includes(q)
    ).sort((a, b) =>
      compareSongs({ number: a.number, short: a.collection.short_name }, { number: b.number, short: b.collection.short_name })
    ).slice(0, 4)
  }, [allSongs, searchQ])

  // Najwyższy song_order wśród zaśpiewanych + 1 — nowo zaśpiewana zawsze na szczycie.
  // Oparte o max istniejącego porządku (nie o liczbę wierszy — to psuło się przy
  // usunięciach/lukach) i tylko o pieśni ZAŚPIEWANE (nie o moment zaplanowania).
  const nextSungOrder = () => sung.reduce((m, ss) => Math.max(m, ss.song_order ?? -1), -1) + 1
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const doAddPlanned = async (songId: string) => {
    const maxPlannedOrder = planned.reduce((m, ss) => Math.max(m, ss.song_order ?? 0), -1)
    await addServiceSong.mutateAsync({
      service_id: serviceId!,
      song_id: songId,
      status: 'planned',
      song_order: maxPlannedOrder + 1,
    })
    setSearchQ('')
    showToast('Dodano do zaplanowanych')
  }

  // Jedna ścieżka dla „zaśpiewana", niezależnie czy klik przyszedł z wyszukiwania,
  // czy z zielonego „✓" przy zaplanowanej: jeśli pieśń ma wpis zaplanowany, ten wiersz
  // zostaje awansowany (plan skonsumowany), zamiast wstawiać drugi wiersz.
  const doMarkSung = async (songId: string, plannedId: string | null) => {
    setJustSungId(songId)
    await markSongSung.mutateAsync({
      service_id: serviceId!,
      song_id: songId,
      planned_id: plannedId,
      song_order: nextSungOrder(),
    })
    setSearchQ('')
    showToast(plannedId ? 'Oznaczono jako zaśpiewaną' : 'Dodano do zaśpiewanych')
    setTimeout(() => setJustSungId(null), 500)
  }

  const plannedIdFor = (songId: string) => planned.find(ss => ss.song.id === songId)?.id ?? null

  const handleAddSong = async (songId: string, status: 'planned' | 'sung') => {
    if (status === 'planned') {
      if (planned.some(ss => ss.song.id === songId)) {
        setShakePlannedId(songId)
        navigator.vibrate?.(100)
        setTimeout(() => setShakePlannedId(null), 320)
        showToast('Ta pieśń jest już zaplanowana')
        return
      }
      await doAddPlanned(songId)
    } else {
      if (sung.some(ss => ss.song.id === songId)) {
        setPendingSung({ kind: 'add', songId })
        return
      }
      await doMarkSung(songId, plannedIdFor(songId))
    }
  }

  const doPromote = async (ss: ServiceSongWithSong) => {
    await doMarkSung(ss.song.id, ss.id)
  }

  const handlePromote = async (ss: ServiceSongWithSong) => {
    if (sung.some(s => s.song.id === ss.song.id)) {
      setPendingSung({ kind: 'promote', ss })
      return
    }
    if (leavingId) return // jeden awans na raz
    if (reduceMotion()) { await doPromote(ss); return }
    // Wiersz „odlatuje" z zaplanowanych, po czym trafia do zaśpiewanych z animacją „drop-in".
    setLeavingId(ss.id)
    setTimeout(() => { setLeavingId(null); doPromote(ss) }, 260)
  }

  const handleRemove = (ss: ServiceSongWithSong) => {
    removeServiceSong.mutate({ id: ss.id, service_id: serviceId! })
  }

  // Zamknięcie edytora: zapisz od razu, nie czekając na debounce. Jeśli
  // poprzednia próba padła, jest to też moment na ponowienie.
  const handleCloseNotes = () => {
    setEditingNotes(false)
    flushNotes()
  }

  // Przesunięcie palcem w bok = poprzednie/następne nabożeństwo. Gest musi
  // ustąpić, gdy trwa edycja notatki (przerzucenie na inne nabożeństwo gubiło
  // wpisany tekst) oraz gdy zaczyna się w polu tekstowym albo na poziomym
  // pasku chipów. Podczas edycji nadal przechwytujemy ruch poziomy — po to,
  // by systemowy gest „wstecz" nie zabrał ekranu w środku pisania.
  useEffect(() => {
    const screen = screenRef.current
    if (!screen) return
    if (navServiceIds.length === 0 && !editingNotes) return
    let startX = 0, startY = 0, decided = false, ignore = false, dir: 'h' | 'v' | null = null

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      decided = false; dir = null
      ignore = isEditableTarget(e.target) || inHorizontalScroller(e.target, screen)
    }
    const onMove = (e: TouchEvent) => {
      if (ignore) return
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
      if (ignore || dir !== 'h' || editingNotes) return
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
  }, [serviceId, navServiceIds, navIdx, canGoPrevSvc, canGoNextSvc, navigate, location.state, editingNotes])

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
    const oldIdx = sungReversed.findIndex(ss => ss.id === active.id)
    const newIdx = sungReversed.findIndex(ss => ss.id === over.id)
    const reordered = arrayMove(sungReversed, oldIdx, newIdx)
    // Visual bottom (highest index in reversed array) = song_order 0 = rank 1
    reordered.forEach((ss, i) => {
      const newOrder = reordered.length - 1 - i
      if (ss.song_order !== newOrder) {
        updateServiceSong.mutate({ id: ss.id, service_id: serviceId!, song_order: newOrder })
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
          {/* Data i godzina w JEDNYM chipie — czwarty chip nie zmieściłby się w
              wierszu na wąskim ekranie, a rozdzielenie tych dwóch nic nie wnosi. */}
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>
            {service ? `${formatDateWithYearPL(service.date)} · ${formatTimePL(service.start_time)}` : '…'}
          </MetaChip>
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>{service?.location.name}</MetaChip>
          <MetaChip icon={<Tag size={14} strokeWidth={1.7} />}>{service?.leader?.name ?? '—'}</MetaChip>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 16 }}>
        {/* notes */}
        <div className="t-label" style={{ marginBottom: 7 }}>Notatki</div>
        {/* Podglądem jest DIV z całą treścią — nie ma w nim karetki, więc rosnąca
            wysokość niczego nie psuje. Edycja dzieje się w pełnoekranowym
            edytorze, gdzie pole przewija się natywnie. */}
        <div className="notes-wrap">
          <div
            className={`notes-box notes-view${notesState === 'error' ? ' err' : ''}`}
            style={{ color: notes ? 'var(--text-2)' : 'var(--text-3)' }}
            onClick={() => { setEditingNotes(true); retryNotes() }}
          >
            {notes || 'Dotknij, aby dodać notatkę…'}
          </div>
          <NotesStatus state={notesState} />
        </div>

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
                  <span className={`badge-col ${collectionClass(s.collection.short_name)}`} style={{ fontSize: 10 }}>{s.collection.short_name} {s.number}</span>
                  <div className="meta">
                    <div className="title" style={{ fontSize: 14 }}>{s.title}</div>
                  </div>
                  <button className={`mini-btn${shakePlannedId === s.id ? ' shake' : ''}`} onClick={() => handleAddSong(s.id, 'planned')}>
                    <Bookmark size={15} strokeWidth={1.7} />
                  </button>
                  <button className="mini-btn good" onClick={() => handleAddSong(s.id, 'sung')}>
                    <Check size={15} strokeWidth={1.7} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
                  leaving={leavingId === ss.id}
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
            <SortableContext items={sungReversed.map(ss => ss.id)} strategy={verticalListSortingStrategy}>
              {sungReversed.map((ss, i) => (
                <SortableRow
                  key={ss.id}
                  ss={ss}
                  rank={sung.length - i}
                  flash={justSungId === ss.song.id}
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

      <Sheet open={pendingSung !== null} onClose={() => setPendingSung(null)}>
        <div className="t-title" style={{ fontSize: 18, marginBottom: 12 }}>Pieśń już zaśpiewana</div>
        <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
          Ta pieśń była już zaśpiewana podczas tego nabożeństwa. Czy dodać po raz drugi?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-block" onClick={() => setPendingSung(null)}>
            Anuluj
          </button>
          <button className="btn btn-primary btn-block" onClick={async () => {
            const p = pendingSung
            setPendingSung(null)
            if (p?.kind === 'add') await doMarkSung(p.songId, plannedIdFor(p.songId))
            else if (p?.kind === 'promote') await doPromote(p.ss)
          }}>
            Dodaj mimo to
          </button>
        </div>
      </Sheet>

      {editingNotes && (
        <NotesEditor
          value={notes}
          onChange={changeNotes}
          state={notesState}
          onClose={handleCloseNotes}
        />
      )}
    </div>
  )
}
