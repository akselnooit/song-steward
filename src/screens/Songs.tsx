import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { TagPill, SongCard, CatBlock, Sheet, Scrubber } from '../components/ui'
import { useLongPress } from '../hooks/useLongPress'
import { useAllSongsForSearch } from '../lib/queries/songs'
import { useCollections, useTags, useTagCategories } from '../lib/queries'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { collectionClass } from '../lib/utils'

const LS_COLS = 'ss-songs-cols'
const LS_INC  = 'ss-songs-inc'
const LS_EXC  = 'ss-songs-exc'
const SCRUBBER_THRESHOLD = 40

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function matches(tagIds: string[], inc: Set<string>, exc: Set<string>) {
  for (const id of inc) if (!tagIds.includes(id)) return false
  for (const id of exc) if (tagIds.includes(id)) return false
  return true
}

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

export function Songs() {
  const { openSong } = useSongOverlay()
  const { data: songs = [] } = useAllSongsForSearch()
  const { data: collections = [] } = useCollections()
  const { data: allTags = [] } = useTags()
  const { data: tagCategories = [] } = useTagCategories()

  const [q, setQ] = useState('')
  const [selColIds, setSelColIds] = useState<Set<string>>(() => readSet(LS_COLS))
  const [inc, setInc] = useState<Set<string>>(() => readSet(LS_INC))
  const [exc, setExc] = useState<Set<string>>(() => readSet(LS_EXC))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openCatId, setOpenCatId] = useState<string | null>(null)

  const screenRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const [headBottom, setHeadBottom] = useState(0)

  useEffect(() => {
    const el = headRef.current
    if (!el) return
    const update = () => setHeadBottom(el.getBoundingClientRect().bottom)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_COLS, JSON.stringify([...selColIds]))
  }, [selColIds])

  useEffect(() => {
    localStorage.setItem(LS_INC, JSON.stringify([...inc]))
    localStorage.setItem(LS_EXC, JSON.stringify([...exc]))
  }, [inc, exc])

  const toggleCol = (id: string) =>
    setSelColIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

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

  const clearAll = () => {
    setSelColIds(new Set())
    setInc(new Set())
    setExc(new Set())
    setQ('')
  }

  // Filtered by collections only
  const colFiltered = useMemo(() => {
    if (selColIds.size === 0) return songs
    return songs.filter(s => selColIds.has(s.collection_id))
  }, [songs, selColIds])

  // Filtered by collections + tags (drives tag availability in sheet — ignores text)
  const tagFiltered = useMemo(() => {
    if (inc.size === 0 && exc.size === 0) return colFiltered
    return colFiltered.filter(s => matches(s.tagIds, inc, exc))
  }, [colFiltered, inc, exc])

  // Final list (+ text search)
  const filtered = useMemo(() => {
    if (!q.trim()) return tagFiltered
    const n = q.toLowerCase()
    return tagFiltered.filter(s =>
      s.title.toLowerCase().includes(n) ||
      (s.author ?? '').toLowerCase().includes(n) ||
      String(s.number).includes(n)
    )
  }, [tagFiltered, q])

  const songIds = useMemo(() => filtered.map(s => s.id), [filtered])

  // Tag IDs present in tagFiltered results (for sheet — collection+tag filter only)
  const presentTagIds = useMemo(() => {
    const set = new Set<string>()
    tagFiltered.forEach(s => s.tagIds.forEach(id => set.add(id)))
    inc.forEach(id => set.add(id))
    exc.forEach(id => set.add(id))
    return set
  }, [tagFiltered, inc, exc])

  const activeFilters = [
    ...Array.from(inc).map(id => ({ id, kind: 'inc' as const })),
    ...Array.from(exc).map(id => ({ id, kind: 'exc' as const })),
  ]

  const tagName = (id: string) => allTags.find(t => t.id === id)?.name ?? id
  const plural = (n: number) => n === 1 ? 'pieśń' : 'pieśni'
  const hasTagFilter = inc.size > 0 || exc.size > 0
  const hasAnyFilter = hasTagFilter || selColIds.size > 0 || q.trim() !== ''

  return (
    <>
      <div className="screen" style={{ paddingTop: 0 }} ref={screenRef}>
        <div className="sticky-head" ref={headRef} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h1 className="t-title" style={{ fontSize: 26, margin: 0 }}>Pieśni</h1>
            <span className="count-line">
              Znaleziono <b>{filtered.length}</b> {plural(filtered.length)}
            </span>
          </div>

          <div className="field-wrap" style={{ marginBottom: 10 }}>
            <span className="field-ico"><Search size={18} strokeWidth={1.7} /></span>
            <input
              className="field field-has-right"
              placeholder="Szukaj: tytuł, autor lub numer"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoComplete="off"
            />
            <button
              className="field-ico-right"
              onClick={() => setSheetOpen(true)}
              aria-label="Filtry tagów"
              style={{ color: hasTagFilter ? 'var(--accent)' : undefined }}
            >
              <Filter size={18} strokeWidth={1.7} />
            </button>
          </div>

          <div className="hrow" style={{ marginBottom: hasAnyFilter ? 10 : 0 }}>
            {collections.map(c => (
              <button
                key={c.id}
                className={`tag ${collectionClass(c.short_name)}${selColIds.has(c.id) ? ' on' : ''}`}
                onClick={() => toggleCol(c.id)}
              >
                {c.short_name}
              </button>
            ))}
          </div>

          {hasAnyFilter && (
            <div className="pill-row">
              {activeFilters.map(f => (
                <button
                  key={f.id}
                  className={`tag ${f.kind === 'inc' ? 'include' : 'exclude'}`}
                  onClick={() => clearOne(f.id)}
                >
                  {tagName(f.id)} <X size={13} strokeWidth={2} />
                </button>
              ))}
              <button className="tag" onClick={clearAll}>
                Wyczyść wszystko
              </button>
            </div>
          )}
        </div>

        <div className="screen-pad" style={{ paddingTop: 14 }}>
          <div className="card list-rows">
            {filtered.map(s => (
              <SongCard
                key={s.id}
                collection={s.collection.short_name}
                number={s.number}
                title={s.title}
                author={s.author ?? ''}
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

        {filtered.length > SCRUBBER_THRESHOLD && (
          <Scrubber songs={filtered} scrollRef={screenRef} topOffset={headBottom} />
        )}
      </div>

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); setOpenCatId(null) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>Filtry tagów</h2>
          <span className="count-line">{filtered.length} {plural(filtered.length)}</span>
        </div>
        {tagCategories.map(cat => {
          const catTags = allTags.filter(t => t.category_id === cat.id && presentTagIds.has(t.id))
          if (catTags.length === 0) return null
          const catSelectedCount = catTags.filter(t => inc.has(t.id) || exc.has(t.id)).length
          return (
            <CatBlock
              key={cat.id}
              name={cat.name}
              selectedCount={catSelectedCount}
              locked={!cat.user_editable}
              open={openCatId === cat.id}
              onToggle={() => setOpenCatId(id => id === cat.id ? null : cat.id)}
            >
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
    </>
  )
}
