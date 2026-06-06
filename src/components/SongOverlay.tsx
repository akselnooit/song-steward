import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Tag, Pencil, History, Bookmark, Check, Calendar, ChevronRight, User, Undo2, X } from 'lucide-react'
import { TagPill, CatBlock, Sheet } from './ui'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { useSongDetail, useSongHistory, useAddSongTag, useRemoveSongTag, useRestoreSongTag } from '../lib/queries'
import { useTagCategories, useTags, useServices, useAddServiceSong } from '../lib/queries'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { useWakeLock } from '../hooks/useWakeLock'
import { keyLabel, collectionClass } from '../lib/utils'


function formatDatePL(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  const [shakeTagId, setShakeTagId] = useState<string | null>(null)
  const [svcStatus, setSvcStatus] = useState<'planned' | 'sung' | null>(null)
  const [photoFull, setPhotoFull] = useState(false)
  const [tagSheetOpen, setTagSheetOpen] = useState(false)
  const [openTagCatId, setOpenTagCatId] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const sheetBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setSvcStatus(null); setTagSheetOpen(false); setOpenTagCatId(null) }, [songId])

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

  const today = todayStr()
  const nearestService = [...services]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find(s => s.date >= today)

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

  const handleAddToService = (status: 'planned' | 'sung') => {
    if (!nearestService) return
    addServiceSong.mutate({ service_id: nearestService.id, song_id: song.id, status, song_order: null })
    setSvcStatus(status)
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
      <div className="sheet" role="dialog" ref={sheetRef}>
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

          {/* add to nearest service */}
          {nearestService && (
            <div className="card" style={{ padding: 14, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
                <span className="t-label" style={{ flex: 1 }}>Najbliższe nabożeństwo</span>
                {nearestService.date === today && (
                  <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>DZIŚ</span>
                )}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{nearestService.category.name}</span>
                <span style={{ color: 'var(--text-3)' }}> · {formatDatePL(nearestService.date)} · {nearestService.location.name}</span>
              </div>
              {svcStatus ? (
                <div className="fin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>
                  <Check size={18} strokeWidth={1.7} />
                  {svcStatus === 'sung' ? 'Dodano do zaśpiewanych' : 'Dodano do zaplanowanych'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => handleAddToService('planned')}>
                    <Bookmark size={18} strokeWidth={1.7} /> Zaplanuj
                  </button>
                  <button className="btn btn-primary btn-block" onClick={() => handleAddToService('sung')}>
                    <Check size={18} strokeWidth={1.7} /> Zaśpiewana
                  </button>
                </div>
              )}
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
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        {formatDatePL(h.service?.date ?? '')}
                      </span>
                      <span style={{ color: 'var(--text-2)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        · {h.service?.location?.name} · {h.service?.leader?.name}
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
    </>,
    document.getElementById('root')!,
  )
}
