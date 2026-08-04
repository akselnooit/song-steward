import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, Check, X, Search, Tag, Pencil, GripVertical } from 'lucide-react'
import {
  DndContext, DragEndEvent, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HRow, MetaChip, Sheet, TimePicker } from '../components/ui'
import { useWakeLock } from '../hooks/useWakeLock'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import {
  useService, useServiceSongs,
  useAddServiceSong, useMarkSongSung, useUpdateServiceSong, useRemoveServiceSong, useUpdateServiceNotes,
  useUpdateService, useLocations, useServiceCategories, useWorshipLeaders, useServices,
} from '../lib/queries'
import { useAllSongsForSearch } from '../lib/queries/songs'
import type { ServiceSongWithSong, ServiceWithRefs } from '../lib/types'
import { collectionClass, compareSongs } from '../lib/utils'
import { inHorizontalScroller, isEditableTarget } from '../lib/gestures'
import { revealAboveKeyboard } from '../lib/scroll'
import { useKeyboardInset } from '../hooks/useKeyboardInset'
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
  const updateNotes = useUpdateServiceNotes()

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
  const [notes, setNotes] = useState(service?.notes ?? '')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Podczas edycji nie nadpisujemy pola danymi z serwera — odświeżenie w tle
  // (np. po dodaniu pieśni) skasowałoby to, co użytkownik właśnie pisze.
  const editingNotesRef = useRef(false)
  editingNotesRef.current = editingNotes
  useEffect(() => {
    if (!editingNotesRef.current) setNotes(service?.notes ?? '')
  }, [service?.notes])

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

  // Ostatnia wartość wysłana do bazy (per nabożeństwo) — zapis z `onBlur`
  // i awaryjny zapis przy znikaniu ekranu nie mogą wysłać tego samego dwa razy.
  const pushedNotes = useRef<{ id: string; value: string } | null>(null)

  const pushNotes = (value: string) => {
    if (!serviceId) return
    if (value === (service?.notes ?? '')) return
    if (pushedNotes.current?.id === serviceId && pushedNotes.current.value === value) return
    pushedNotes.current = { id: serviceId, value }
    updateNotes.mutate({ id: serviceId, notes: value })
  }

  const handleSaveNotes = () => {
    setEditingNotes(false)
    pushNotes(notes)
  }

  // Textarea rośnie z treścią — długiej notatki nie oglądamy już przez szparę
  // na 3 linijki, a wysokość pudełka jest ta sama co w podglądzie, więc wejście
  // w edycję nie przesuwa zawartości ekranu.
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    const chrome = el.offsetHeight - el.clientHeight   // obrys (box-sizing: border-box)
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + chrome}px`
    // Pole ma `overflow: hidden` i mieści całą treść, więc własny `scrollTop`
    // powinien być zerem. WebKit zostawiał tu resztkę po chwilowym przepełnieniu
    // (między dwoma przypisaniami wysokości) i malował karetkę o tyle obok.
    el.scrollTop = 0
  }
  useLayoutEffect(() => { if (editingNotes) autoGrow(notesRef.current) }, [editingNotes, notes])
  useLayoutEffect(() => {
    const el = notesRef.current
    if (!editingNotes || !el) return
    // `preventScroll` — heurystyka przeglądarki wyrównywała GÓRĘ wysokiego pola
    // (kursor lądował pod klawiaturą) i potrafiła szarpnąć ekranem. Przewijanie
    // bierzemy więc w całości na siebie, w efekcie niżej.
    el.focus({ preventScroll: true })
    el.selectionStart = el.selectionEnd = el.value.length
  }, [editingNotes])

  // Zapas na klawiaturę na dole ekranu — bez niego `scrollTop` jest przycięty
  // do końca zawartości i dół pola nie ma jak wyjechać nad klawiaturę.
  const kbdInset = useKeyboardInset(editingNotes)

  // Dowiezienie dołu pola (czyli kursora — stoi na końcu tekstu, a pole rośnie
  // z treścią) nad klawiaturę. Efekt wznawia się, gdy:
  //  • wchodzimy w edycję,
  //  • zmienia się `kbdInset` — czyli klawiatura właśnie weszła i zapas jest już
  //    doklejony w tym samym renderze (wysokość widocznego obszaru kurczy się
  //    dopiero po animacji klawiatury, więc wcześniej nie da się policzyć celu),
  // Powtórka po 260 ms wygrywa z ewentualnym własnym „odsłanianiem" pola przez
  // przeglądarkę; obie próby są bezstratne (cel liczony bezwzględnie).
  useEffect(() => {
    if (!editingNotes) return
    const run = () => revealAboveKeyboard(notesRef.current, screenRef.current)
    run()
    const t = window.setTimeout(run, 260)
    return () => window.clearTimeout(t)
  }, [editingNotes, kbdInset])

  // Pisanie: dopisywana linia nie może schować się pod klawiaturą, ale bez
  // animacji — płynne przewijanie startowane na każdy znak nigdy nie dobiega
  // końca. `revealAboveKeyboard` samo nic nie robi, gdy dół pola jest widoczny,
  // więc przy krótkiej notatce ten efekt jest bezkosztowy.
  useEffect(() => {
    if (!editingNotes) return
    revealAboveKeyboard(notesRef.current, screenRef.current, { instant: true })
  }, [notes, editingNotes])

  // Sieć bezpieczeństwa dla niezapisanych notatek. `onBlur` nie zdąży się
  // wykonać, gdy ekran znika bez odkliknięcia pola — systemowy gest „wstecz"
  // iOS, przejście aplikacji w tło, zamknięcie karty. Mutacja odpalona przy
  // odmontowaniu i tak leci do końca (żyje w cache mutacji, nie w komponencie).
  const flushNotes = useRef(() => {})
  flushNotes.current = () => pushNotes(notes)
  useEffect(() => {
    const onHide = () => flushNotes.current()
    const onVisibility = () => { if (document.hidden) flushNotes.current() }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      flushNotes.current()
    }
  }, [])

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
        <div className="notes-wrap">
          {editingNotes ? (
            <textarea
              ref={notesRef}
              className="notes-box notes-edit"
              value={notes}
              rows={1}
              onChange={e => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              onKeyDown={e => { if (e.key === 'Escape') handleSaveNotes() }}
            />
          ) : (
            <>
              <div
                className="notes-box notes-view"
                style={{ color: notes ? 'var(--text-2)' : 'var(--text-3)' }}
                onClick={() => setEditingNotes(true)}
              >
                {notes || 'Dotknij, aby dodać notatkę…'}
              </div>
              <Pencil className="notes-pencil" size={15} strokeWidth={1.7} aria-hidden />
            </>
          )}
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

        {/* Zapas na klawiaturę — daje kontenerowi dokąd przewinąć, gdy pole
            notatek kończy się nisko. Znika dopiero po schowaniu klawiatury. */}
        {kbdInset > 0 && <div aria-hidden style={{ height: kbdInset }} />}
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
    </div>
  )
}
