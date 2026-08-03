import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Tag, Pencil, History, Bookmark, Check, Calendar, ChevronRight, ChevronDown, User, Undo2, X } from 'lucide-react'
import { TagPill, CatBlock, Sheet } from './ui'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { useSongDetail, useSongHistory, useAddSongTag, useRemoveSongTag, useRestoreSongTag } from '../lib/queries'
import { useTagCategories, useTags, useServices, useAddServiceSong, useMarkSongSung, useServiceSongs, useTodayServiceSongIds } from '../lib/queries'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { useWakeLock } from '../hooks/useWakeLock'
import { keyLabel, collectionClass, songTreasuresUrl } from '../lib/utils'
import songTreasuresIcon from '../assets/song-treasures-icon.png'
import { compareServices, formatDateWithYearPL, formatTimePL, todayStr } from '../lib/dates'

// Data z godziną — w tym arkuszu wybiera się KONKRETNE nabożeństwo, więc dwa
// tego samego dnia muszą być rozróżnialne.
function formatWhen(dateStr: string, time?: string | null) {
  const date = formatDateWithYearPL(dateStr)
  return time ? `${date} · ${formatTimePL(time)}` : date
}

export function SongOverlay() {
  const navigate = useNavigate()
  const { songId, closeSong, goPrev, goNext, canGoPrev, canGoNext } = useSongOverlay()
  const [locationId] = useLocationFilter()
  const { data: song } = useSongDetail(songId)
  const { data: history = [] } = useSongHistory(songId, locationId)
  const { data: tagCategories = [] } = useTagCategories()
  const { data: allTags = [] } = useTags()
  const { data: services = [] } = useServices(locationId)
  const addSongTag = useAddSongTag()
  useWakeLock(!!songId)
  const removeSongTag = useRemoveSongTag()
  const restoreSongTag = useRestoreSongTag()
  const addServiceSong = useAddServiceSong()
  const markSongSung = useMarkSongSung()
  const todaySongs = useTodayServiceSongIds()

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false)
  const [shakeTagId, setShakeTagId] = useState<string | null>(null)
  const [shakePlanned, setShakePlanned] = useState(false)
  const [confirmSung, setConfirmSung] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [photoFull, setPhotoFull] = useState(false)
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [openTagCatId, setOpenTagCatId] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const sheetBodyRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Kandydujące nabożeństwa = nadchodzące (wg globalnego filtra lokalizacji: useServices
  // już filtruje). Domyślny cel = najbliższe; przy >1 użytkownik może wybrać inne.
  const today = todayStr()
  const upcomingServices = [...services]
    .sort(compareServices)
    .filter(s => s.date >= today)
  const selectedService = upcomingServices.find(s => s.id === selectedServiceId) ?? upcomingServices[0]
  const { data: selectedServiceSongs = [] } = useServiceSongs(selectedService?.id ?? null)

  // Nowa pieśń → reset do najbliższego; zmiana celu → reset potwierdzeń/komunikatów.
  useEffect(() => { setSelectedServiceId(null); setConfirmSung(false); setToast(null); setTagSheetOpen(false); setOpenTagCatId(null); setServiceSheetOpen(false) }, [songId])
  useEffect(() => { setToast(null) }, [selectedServiceId])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  useEffect(() => {
    if (!songId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSong()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [songId, closeSong, goPrev, goNext])

  // Only vertical pull-down-to-close (horizontal song navigation is done with the
  // on-screen prev/next buttons — see .sheet-nav). Swipe left/right was removed.
  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet || !songId) return
    let startY = 0, startScrollTop = 0, dragging = false

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      startScrollTop = sheetBodyRef.current?.scrollTop ?? 0
      dragging = false
      sheet.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY
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
      if (dragging && dy > 80 && startScrollTop === 0) closeSong()
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
    // closeSong is stable (memoized in context) — rebind when song changes or when
    // song first loads (sheet may not exist yet on first render if data was not cached).
  }, [songId, !!song])

  if (!songId || !song) return null

  // Wiersz zaplanowany, który „Zaśpiewana" skonsumuje (awans planned→sung).
  const plannedRow = selectedServiceSongs.find(ss => ss.song_id === song.id && ss.status === 'planned') ?? null
  const alreadyPlanned = !!plannedRow
  const alreadySung = selectedServiceSongs.some(ss => ss.song_id === song.id && ss.status === 'sung')
  const sungToday = todaySongs.sung.has(song.id)
  const plannedToday = !sungToday && todaySongs.planned.has(song.id) // sung ma priorytet

  const currentTags = new Map(song.song_tags.map(st => [st.tag_id, st]))

  const shake = (tagId: string, locked: boolean) => {
    if (!locked) return
    setShakeTagId(tagId)
    navigator.vibrate?.(100)
    setTimeout(() => setShakeTagId(null), 320)
  }

  const handleTagToggle = (tagId: string, categoryId: string) => {
    const cat = tagCategories.find(c => c.id === categoryId)
    const locked = !cat?.user_editable
    if (locked) { shake(tagId, true); return }
    const existing = currentTags.get(tagId)
    if (existing?.pending_removal) {
      restoreSongTag.mutate({ song_id: song.id, tag_id: tagId })
    } else if (existing) {
      removeSongTag.mutate({ song_id: song.id, tag_id: tagId, source: existing.source })
    } else {
      addSongTag.mutate({ song_id: song.id, tag_id: tagId })
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }

  const doPlan = () => {
    if (!selectedService) return
    addServiceSong.mutate({ service_id: selectedService.id, song_id: song.id, status: 'planned', song_order: null })
    showToast('Dodano do zaplanowanych')
  }

  // Zaśpiewane: nadaj najwyższy song_order (max+1), żeby nowo zaśpiewana trafiła
  // na szczyt listy. Nigdy null — null psuł kolejność (sortował się jako „na górze").
  // Jeśli pieśń jest zaplanowana, awansujemy TEN wiersz zamiast wstawiać drugi —
  // dzięki temu plan się zwalnia i „Zaplanuj" znów działa.
  const doMarkSung = () => {
    if (!selectedService) return
    const maxSungOrder = selectedServiceSongs.reduce(
      (m, ss) => ss.status === 'sung' ? Math.max(m, ss.song_order ?? -1) : m, -1,
    )
    markSongSung.mutate({
      service_id: selectedService.id,
      song_id: song.id,
      planned_id: plannedRow?.id ?? null,
      song_order: maxSungOrder + 1,
    })
    showToast(plannedRow ? 'Oznaczono jako zaśpiewaną' : 'Dodano do zaśpiewanych')
  }

  const handlePlan = () => {
    if (!selectedService) return
    // Zaplanowane: duplikat blokowany, ale przycisk zostaje klikalny — shake + toast
    // mówią dlaczego, zamiast martwego, wyszarzonego przycisku.
    if (alreadyPlanned) {
      setShakePlanned(true)
      navigator.vibrate?.(100)
      setTimeout(() => setShakePlanned(false), 320)
      showToast('Ta pieśń jest już zaplanowana')
      return
    }
    doPlan()
  }

  const handleSung = () => {
    if (!selectedService) return
    // Zaśpiewane po raz drugi: pozwól po potwierdzeniu.
    if (alreadySung) { setConfirmSung(true); return }
    doMarkSung()
  }

  const handleHistoryClick = (serviceId: string) => {
    const navServiceIds = (history as any[]).map(h => h.service?.id).filter(Boolean)
    closeSong()
    navigate(`/live/${serviceId}`, { state: { navServiceIds, fromSongId: song.id } })
  }

  const selectedTags = song.song_tags.filter(st => !st.pending_removal)

  return createPortal(
    <>
      <div className="scrim" onClick={closeSong} />
      <div className={`sheet${sungToday ? ' mark-sung' : plannedToday ? ' mark-planned' : ''}`} role="dialog" ref={sheetRef}>
        <div className="sheet-grab" />

        {canGoPrev && (
          <button className="sheet-nav" style={{ left: 10 }} onClick={goPrev} aria-label="Poprzednia pieśń">
            <ChevronLeft size={26} strokeWidth={2} />
          </button>
        )}
        {canGoNext && (
          <button className="sheet-nav" style={{ right: 10 }} onClick={goNext} aria-label="Następna pieśń">
            <ChevronRight size={26} strokeWidth={2} />
          </button>
        )}

        <div className="sheet-body" ref={sheetBodyRef}>
          {/* header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 8px 4px' }}>
            {/* author photo */}
            {song.author_image ? (
              <button
                onClick={() => setPhotoFull(true)}
                style={{ width: 76, height: 76, borderRadius: '50%', border: '1px solid var(--border)', marginBottom: 12, overflow: 'hidden', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              >
                <img
                  src={song.author_image}
                  alt={song.author ?? ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                />
              </button>
            ) : (
              <div className="photo-ph" style={{ width: 76, height: 76, borderRadius: '50%', border: '1px solid var(--border)', marginBottom: 12, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
                <User size={32} strokeWidth={1.3} />
              </div>
            )}
            <span className={`badge-col ${collectionClass(song.collection.short_name)}`} style={{ marginBottom: 9 }}>
              {song.collection.short_name} {song.number}
            </span>
            <h2 className="t-title" style={{ fontSize: 23, margin: '0 0 10px', lineHeight: 1.15 }}>
              {song.title}
            </h2>
            <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 8 }}>{song.author}</div>
            {song.original_key && (
              <div className="t-mono" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                {keyLabel(song.original_key, song.minor ?? false)}
              </div>
            )}
          </div>

          {/* add to a chosen upcoming service (default: nearest) */}
          {selectedService && (
            <div className="card" style={{ padding: 14, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                <span className="t-label" style={{ flex: 1 }}>
                  {upcomingServices.length > 1 ? 'Nabożeństwo' : 'Najbliższe nabożeństwo'}
                </span>
                {selectedService.date === today && (
                  <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>DZIŚ</span>
                )}
              </div>
              {upcomingServices.length > 1 ? (
                // >1 kandydat → wybór celu dodania (rozwijana lista)
                <button
                  onClick={() => setServiceSheetOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 12px', marginBottom: 13, cursor: 'pointer', color: 'var(--text)' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{selectedService.category.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{formatWhen(selectedService.date, selectedService.start_time)} · {selectedService.location.name}</div>
                  </div>
                  <ChevronDown size={18} strokeWidth={1.7} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                </button>
              ) : (
                <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedService.category.name}</span>
                  <span style={{ color: 'var(--text-3)' }}> · {formatWhen(selectedService.date, selectedService.start_time)} · {selectedService.location.name}</span>
                </div>
              )}
              {/* Przyciski są ZAWSZE widoczne — potwierdzenie leci toastem, nie panelem
                  zastępującym. Inaczej po dodaniu nie było w co kliknąć (np. żeby po
                  zaśpiewaniu od razu zaplanować pieśń ponownie). */}
              <div style={{ display: 'flex', gap: 10 }}>
                {/* „Zaplanuj" zależy WYŁĄCZNIE od tego, czy pieśń jest już zaplanowana —
                    zaśpiewanie NIE blokuje planowania (konsumuje plan, więc go zwalnia). */}
                <button className={`btn btn-ghost btn-block${shakePlanned ? ' shake' : ''}`} onClick={handlePlan}>
                  <Bookmark size={18} strokeWidth={1.7} /> {alreadyPlanned ? 'Zaplanowana' : 'Zaplanuj'}
                </button>
                <button className="btn btn-primary btn-block" onClick={handleSung}>
                  <Check size={18} strokeWidth={1.7} /> Zaśpiewana
                </button>
              </div>
            </div>
          )}

          {/* selected tags summary */}
          {selectedTags.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <Tag size={14} strokeWidth={1.7} /> Wybrane tagi · {selectedTags.length}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedTags.map(st => (
                  <span key={st.tag_id} className={`tag src-${st.source}`} style={{ cursor: 'default' }}>
                    <span className="dot" />
                    {st.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* tag editor button */}
          <div style={{ marginTop: selectedTags.length > 0 ? 14 : 20 }}>
            <button
              className="btn btn-ghost btn-block"
              style={{ justifyContent: 'flex-start', gap: 8 }}
              onClick={() => setTagSheetOpen(true)}
            >
              <Pencil size={15} strokeWidth={1.7} /> Edytuj tagi
            </button>
          </div>

          {/* open in Song Treasures — universal/app link otwiera natywną apkę na telefonie */}
          <div style={{ marginTop: 10 }}>
            <a
              className="btn btn-treasures btn-block"
              href={songTreasuresUrl(song.collection.short_name, song.number)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ justifyContent: 'flex-start', gap: 10 }}
            >
              <img
                src={songTreasuresIcon}
                alt=""
                aria-hidden="true"
                width={22}
                height={22}
                style={{ borderRadius: 5, flexShrink: 0 }}
              />
              Otwórz w Song Treasures
            </a>
          </div>

          {/* tag editor sheet */}
          <Sheet open={tagSheetOpen} onClose={() => { setTagSheetOpen(false); setOpenTagCatId(null) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <h2 className="t-title" style={{ fontSize: 20, margin: 0, flex: 1 }}>{song.title}</h2>
            </div>
            {tagCategories.map(cat => {
              const catTags = allTags.filter(t => t.category_id === cat.id)
              const activeTagIds = new Set(song.song_tags.filter(st => !st.pending_removal).map(st => st.tag_id))
              const locked = !cat.user_editable
              const selectedCount = catTags.filter(t => activeTagIds.has(t.id)).length

              return (
                <CatBlock key={cat.id} name={cat.name} selectedCount={selectedCount} locked={locked}
                  open={openTagCatId === cat.id}
                  onToggle={() => setOpenTagCatId(id => id === cat.id ? null : cat.id)}>
                  {catTags.map(tag => {
                    const st = song.song_tags.find(s => s.tag_id === tag.id)
                    const isPendingRemoval = st?.pending_removal ?? false
                    const isActive = !!st && !isPendingRemoval
                    const isUserAdded = isActive && st?.source === 'user'

                    let pillStyle: React.CSSProperties | undefined
                    if (isPendingRemoval) {
                      pillStyle = { textDecoration: 'line-through', background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger-bd)' }
                    } else if (!isActive) {
                      pillStyle = { opacity: 0.55, borderStyle: 'dashed' }
                    }

                    return (
                      <span key={tag.id} className={shakeTagId === tag.id ? 'shake' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <TagPill
                          name={tag.name}
                          source={isActive ? (st?.source ?? 'user') : undefined}
                          locked={locked}
                          onClick={() => handleTagToggle(tag.id, cat.id)}
                          style={pillStyle}
                        />
                        {(isUserAdded || isPendingRemoval) && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              if (isPendingRemoval) {
                                restoreSongTag.mutate({ song_id: song.id, tag_id: tag.id })
                              } else {
                                removeSongTag.mutate({ song_id: song.id, tag_id: tag.id, source: 'user' })
                              }
                            }}
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              border: '1px solid', cursor: 'pointer',
                              display: 'grid', placeItems: 'center', flexShrink: 0,
                              background: isPendingRemoval ? 'var(--danger-soft)' : 'var(--src-user-soft)',
                              color: isPendingRemoval ? 'var(--danger)' : 'var(--src-user)',
                              borderColor: isPendingRemoval ? 'var(--danger-bd)' : 'var(--src-user-bd)',
                              padding: 0,
                            }}
                            title={isPendingRemoval ? 'Cofnij usunięcie' : 'Cofnij dodanie'}
                          >
                            <Undo2 size={11} strokeWidth={2} />
                          </button>
                        )}
                      </span>
                    )
                  })}
                </CatBlock>
              )
            })}
          </Sheet>

          {/* singing history */}
          <div style={{ marginTop: 22 }}>
            <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <History size={14} strokeWidth={1.7} /> Historia śpiewania
            </div>
            {history.length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>Brak historii śpiewania</div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="list-rows">
                  {(history as any[]).map((h, i) => (
                    <div
                      key={i}
                      onClick={() => h.service?.id && handleHistoryClick(h.service.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: h.service?.id ? 'pointer' : 'default' }}
                    >
                      <Calendar size={16} strokeWidth={1.7} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', flexShrink: 0 }}>
                        {h.service ? formatWhen(h.service.date, h.service.start_time) : '—'}
                      </span>
                      {/* Prowadzący jest opcjonalny — sklejamy tylko niepuste człony,
                          żeby przy jego braku nie zostawała wisząca „· " na końcu. */}
                      <span style={{ color: 'var(--text-2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[h.service?.location?.name, h.service?.leader?.name].filter(Boolean).map(part => ` · ${part}`).join('')}
                      </span>
                      <ChevronRight size={15} strokeWidth={1.7} style={{ marginLeft: 'auto', color: 'var(--text-3)', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* fullscreen author photo */}
      {photoFull && song.author_image && (
        <div
          onClick={() => setPhotoFull(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setPhotoFull(false)}
            style={{ position: 'absolute', top: 18, right: 18, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff' }}
          >
            <X size={20} strokeWidth={1.7} />
          </button>
          <img
            src={song.author_image}
            alt={song.author ?? ''}
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          />
        </div>
      )}

      {/* wybór nabożeństwa docelowego (gdy >1 nadchodzące) */}
      <Sheet open={serviceSheetOpen} onClose={() => setServiceSheetOpen(false)}>
        <div className="t-title" style={{ fontSize: 18, marginBottom: 14 }}>Wybierz nabożeństwo</div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="list-rows">
            {upcomingServices.map(s => (
              <div
                key={s.id}
                onClick={() => { setSelectedServiceId(s.id); setServiceSheetOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.category.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{formatWhen(s.date, s.start_time)} · {s.location.name}</div>
                </div>
                {s.date === today && (
                  <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>DZIŚ</span>
                )}
                {selectedService && s.id === selectedService.id && (
                  <Check size={16} strokeWidth={2} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Sheet>

      {/* potwierdzenie dodania pieśni po raz drugi do zaśpiewanych */}
      <Sheet open={confirmSung} onClose={() => setConfirmSung(false)}>
        <div className="t-title" style={{ fontSize: 18, marginBottom: 12 }}>Pieśń już w zaśpiewanych</div>
        <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
          Ta pieśń jest już w zaśpiewanych. Dodać jeszcze raz?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-block" onClick={() => setConfirmSung(false)}>
            Anuluj
          </button>
          <button className="btn btn-primary btn-block" onClick={() => { setConfirmSung(false); doMarkSung() }}>
            Dodaj mimo to
          </button>
        </div>
      </Sheet>

      {/* .saved-toast: position: fixed, z-index 50 → nad arkuszem (41) */}
      {toast && (
        <div className="saved-toast fin">
          <Check size={15} strokeWidth={1.7} /> {toast}
        </div>
      )}
    </>,
    document.getElementById('root')!,
  )
}
