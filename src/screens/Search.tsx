import { useState, useMemo } from 'react'
import { X, Filter } from 'lucide-react'
import { TagPill, SongCard, CatBlock, Sheet } from '../components/ui'
import { useLongPress } from '../hooks/useLongPress'
import { useAllSongsForSearch } from '../lib/queries/songs'
import { useTags, useTagCategories } from '../lib/queries'
import { useSongOverlay } from '../contexts/SongOverlayContext'

// ── filtering logic ──────────────────────────────────────────────

function matches(tagIds: string[], inc: Set<string>, exc: Set<string>) {
  for (const id of inc) if (!tagIds.includes(id)) return false
  for (const id of exc) if (tagIds.includes(id)) return false
  return true
}

// ── FilterTag: tag pill with long-press exclude ──────────────────

function FilterTag({ name, source, inc, exc, onInc, onExc }: {
  name: string; source: string
  inc: boolean; exc: boolean
  onInc: () => void; onExc: () => void
}) {
  const lp = useLongPress(onInc, onExc)
  const state = inc ? 'include' as const : exc ? 'exclude' as const : null
  return (
    <TagPill
      name={name}
      source={state ? undefined : source as 'confirmed' | 'user' | 'ai'}
      state={state}
      {...lp}
    />
  )
}

// ── Search screen ────────────────────────────────────────────────

export function Search() {
  const { openSong } = useSongOverlay()
  const { data: songs = [] } = useAllSongsForSearch()
  const { data: allTags = [] } = useTags()
  const { data: tagCategories = [] } = useTagCategories()

  const [inc, setInc] = useState<Set<string>>(new Set())
  const [exc, setExc] = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)

  const toggleInc = (id: string) => {
    setExc(e => { const n = new Set(e); n.delete(id); return n })
    setInc(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleExc = (id: string) => {
    setInc(s => { const n = new Set(s); n.delete(id); return n })
    setExc(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const clearOne = (id: string) => {
    setInc(s => { const n = new Set(s); n.delete(id); return n })
    setExc(e => { const n = new Set(e); n.delete(id); return n })
  }

  const results = useMemo(
    () => songs.filter(s => matches(s.tagIds, inc, exc)),
    [songs, inc, exc]
  )

  const songIds = useMemo(() => results.map(s => s.id), [results])

  // tag IDs present in current results
  const presentTagIds = useMemo(() => {
    const set = new Set<string>()
    results.forEach(s => s.tagIds.forEach(id => set.add(id)))
    inc.forEach(id => set.add(id))
    exc.forEach(id => set.add(id))
    return set
  }, [results, inc, exc])

  // popular tags: most frequent in results, max 12
  const popularTags = useMemo(() => {
    const counts = new Map<string, number>()
    results.forEach(s => s.tagIds.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1)))
    return allTags
      .filter(t => presentTagIds.has(t.id))
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
      .slice(0, 12)
  }, [results, allTags, presentTagIds])

  const activeFilters = [
    ...Array.from(inc).map(id => ({ id, kind: 'inc' as const })),
    ...Array.from(exc).map(id => ({ id, kind: 'exc' as const })),
  ]

  const tagName = (id: string) => allTags.find(t => t.id === id)?.name ?? id
  const plural = (n: number) => n === 1 ? 'pieśń' : 'pieśni'

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      {/* sticky header */}
      <div className="sticky-head" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 className="t-title" style={{ fontSize: 26, margin: 0 }}>Szukaj</h1>
          <span className="count-line">
            Znaleziono <b>{results.length}</b> {plural(results.length)}
          </span>
        </div>

        {activeFilters.length > 0 ? (
          <div className="pill-row" style={{ marginBottom: 10 }}>
            {activeFilters.map(f => (
              <button
                key={f.id}
                className={`tag ${f.kind === 'inc' ? 'include' : 'exclude'}`}
                onClick={() => clearOne(f.id)}
              >
                {tagName(f.id)} <X size={13} strokeWidth={2} />
              </button>
            ))}
          </div>
        ) : (
          <div className="hint" style={{ marginBottom: 10 }}>
            Dotknij tagu · przytrzymaj, aby wykluczyć
          </div>
        )}

        {/* popular tags row */}
        {popularTags.length > 0 && (
          <div className="hrow">
            {popularTags.map(tag => (
              <FilterTag
                key={tag.id}
                name={tag.name}
                source="confirmed"
                inc={inc.has(tag.id)}
                exc={exc.has(tag.id)}
                onInc={() => toggleInc(tag.id)}
                onExc={() => toggleExc(tag.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* results */}
      <div className="screen-pad" style={{ paddingTop: 14 }}>
        <div className="card list-rows">
          {results.map(s => (
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
          {results.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
              Brak pieśni dla tych filtrów
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setSheetOpen(true)}>
        <Filter size={18} strokeWidth={1.7} /> Wszystkie tagi
      </button>

      {/* all tags sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>Wszystkie tagi</h2>
          <span className="count-line">{results.length} {plural(results.length)}</span>
        </div>
        {tagCategories.map(cat => {
          const catTags = allTags.filter(t => t.category_id === cat.id && presentTagIds.has(t.id))
          if (catTags.length === 0) return null
          return (
            <CatBlock key={cat.id} name={cat.name} count={catTags.length}
              locked={!cat.user_editable} defaultOpen={false}>
              {catTags.map(tag => (
                <FilterTag
                  key={tag.id}
                  name={tag.name}
                  source="confirmed"
                  inc={inc.has(tag.id)}
                  exc={exc.has(tag.id)}
                  onInc={() => toggleInc(tag.id)}
                  onExc={() => toggleExc(tag.id)}
                />
              ))}
            </CatBlock>
          )
        })}
      </Sheet>
    </div>
  )
}
