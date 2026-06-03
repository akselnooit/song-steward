import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { SongCard } from '../components/ui'
import { useSongs, useCollections } from '../lib/queries'
import { useSongOverlay } from '../contexts/SongOverlayContext'

export function Songs() {
  const { openSong } = useSongOverlay()
  const { data: collections = [] } = useCollections()
  const [selectedColId, setSelectedColId] = useState('')
  const [q, setQ] = useState('')

  const colId = selectedColId || collections[0]?.id || ''
  const { data: songs = [] } = useSongs(colId)

  const filtered = useMemo(() => {
    if (!q.trim()) return songs
    const n = q.toLowerCase()
    return songs.filter(s =>
      s.title.toLowerCase().includes(n) ||
      (s.author ?? '').toLowerCase().includes(n) ||
      String(s.number).includes(n)
    )
  }, [songs, q])

  const songIds = useMemo(() => filtered.map(s => s.id), [filtered])

  return (
    <div className="screen">
      <div className="app-header">
        <h1>Pieśni</h1>
      </div>

      <div style={{ padding: '0 18px 10px' }}>
        <div className="field-wrap" style={{ marginBottom: 12 }}>
          <span className="field-ico"><Search size={18} strokeWidth={1.7} /></span>
          <input
            className="field"
            placeholder="Szukaj: tytuł, autor lub numer"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="hrow">
          {collections.map(c => (
            <button
              key={c.id}
              className={`tag${colId === c.id ? ' include' : ''}`}
              onClick={() => { setSelectedColId(c.id); setQ('') }}
            >
              {c.short_name}
            </button>
          ))}
        </div>
      </div>

      <div className="screen-pad">
        <div className="count-line" style={{ margin: '6px 2px 10px' }}>
          Znaleziono <b>{filtered.length}</b> {filtered.length === 1 ? 'pieśń' : 'pieśni'}
        </div>
        <div className="card list-rows">
          {filtered.map(s => (
            <SongCard
              key={s.id}
              collection={s.collection.short_name}
              number={s.number}
              title={s.title}
              author={s.author ?? ''}
              authorImage={s.author_image}
              songKey={s.original_key ?? undefined}
              minor={s.minor ?? false}
              onClick={() => openSong(s.id, songIds)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
              Brak wyników
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
