import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Tag, Pencil, History, Bookmark, Check, Calendar, ChevronRight, User } from 'lucide-react'
import { TagPill, CatBlock } from './ui'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { useSongDetail, useSongHistory, useAddSongTag, useRemoveSongTag } from '../lib/queries'
import { useTagCategories, useTags, useServices, useAddServiceSong } from '../lib/queries'
import { keyLabel } from '../lib/utils'


function formatDatePL(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SongOverlay() {
  const { songId, closeSong, goPrev, goNext, canGoPrev, canGoNext } = useSongOverlay()
  const { data: song } = useSongDetail(songId)
  const { data: history = [] } = useSongHistory(songId)
  const { data: tagCategories = [] } = useTagCategories()
  const { data: allTags = [] } = useTags()
  const { data: services = [] } = useServices()
  const addSongTag = useAddSongTag()
  const removeSongTag = useRemoveSongTag()
  const addServiceSong = useAddServiceSong()

  const [shakeTagId, setShakeTagId] = useState<string | null>(null)
  const [svcStatus, setSvcStatus] = useState<'planned' | 'sung' | null>(null)

  useEffect(() => { setSvcStatus(null) }, [songId])

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
    if (existing) {
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

  const selectedTags = song.song_tags.filter(st => !st.pending_removal)

  return createPortal(
    <>
      <div className="scrim" onClick={closeSong} />
      <div className="sheet" role="dialog">
        <div className="sheet-grab" />

        {canGoPrev && (
          <div className="sheet-nav" style={{ left: 14 }} onClick={goPrev}>
            <ArrowLeft size={18} strokeWidth={1.7} />
          </div>
        )}
        {canGoNext && (
          <div className="sheet-nav" style={{ right: 14 }} onClick={goNext}>
            <ArrowRight size={18} strokeWidth={1.7} />
          </div>
        )}

        <div className="sheet-body">
          {/* header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '14px 8px 4px' }}>
            <div className="photo-ph" style={{ width: 76, height: 76, borderRadius: '50%', border: '1px solid var(--border)', marginBottom: 12, display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
              <User size={32} strokeWidth={1.3} />
            </div>
            <span className="badge-col" style={{ marginBottom: 9 }}>
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

          {/* tag categories */}
          <div style={{ marginTop: 20 }}>
            <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <Pencil size={13} strokeWidth={1.7} /> Edytuj tagi wg kategorii
            </div>
            {tagCategories.map(cat => {
              const catTags = allTags.filter(t => t.category_id === cat.id)
              const onSong = new Set(song.song_tags.filter(st => !st.pending_removal).map(st => st.tag_id))
              const locked = !cat.user_editable
              const count = catTags.filter(t => onSong.has(t.id)).length

              return (
                <CatBlock key={cat.id} name={cat.name} count={count} locked={locked}
                  defaultOpen={false}>
                  {catTags.map(tag => {
                    const isOn = onSong.has(tag.id)
                    const st = song.song_tags.find(st => st.tag_id === tag.id)
                    const source = isOn ? (st?.source ?? 'user') : undefined
                    return (
                      <span key={tag.id} className={shakeTagId === tag.id ? 'shake' : ''}>
                        <TagPill
                          name={tag.name}
                          source={isOn ? source : undefined}
                          locked={locked}
                          onClick={() => handleTagToggle(tag.id, cat.id)}
                          style={!isOn ? { opacity: 0.55, borderStyle: 'dashed' } as React.CSSProperties : undefined}
                        />
                      </span>
                    )
                  })}
                </CatBlock>
              )
            })}
          </div>

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
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                      <Calendar size={16} strokeWidth={1.7} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {formatDatePL(h.service?.date ?? '')}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                        · {h.service?.location?.name} · {h.service?.leader?.name}
                      </span>
                      <ChevronRight size={15} strokeWidth={1.7} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="hint" style={{ marginTop: 10, justifyContent: 'center' }}>
              ← → zmiana pieśni · Esc zamknięcie
            </div>
          </div>
        </div>
      </div>
    </>,
    document.getElementById('root')!,
  )
}
