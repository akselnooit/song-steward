import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Filter, X, Sparkles } from 'lucide-react'
import { TagPill, SongCard, CatBlock, Sheet, Scrubber } from '../components/ui'
import { useLongPress } from '../hooks/useLongPress'
import { useAllSongsForSearch, useSongStats } from '../lib/queries/songs'
import { useCollections, useTags, useTagCategories, useTodayServiceSongIds, useLocations } from '../lib/queries'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { collectionClass, compareSongs } from '../lib/utils'
import { agoLabelPL } from '../lib/dates'
import type { SongStat } from '../lib/queries/songs'

const LS_COLS = 'ss-songs-cols'
const LS_INC  = 'ss-songs-inc'
const LS_EXC  = 'ss-songs-exc'
const LS_SORT = 'ss-songs-sort'
const SCRUBBER_THRESHOLD = 40

/** Ile podpowiedzi tagów pokazujemy nad listą. Pasek i tak się przewija, ale
 *  po kilkunastu chipach przestaje być „podpowiedzią", a staje się drugą listą. */
const MAX_SUGGESTIONS = 12

/**
 * Porządek listy pieśni.
 * - `number` — numer rosnąco (przeglądanie śpiewnika, domyślny),
 * - `rare`   — nigdy niegrane na początku, potem od najdawniej granych,
 * - `often`  — od najczęściej granych.
 * Statystyki liczą się w zakresie globalnego filtra lokalizacji.
 */
type SortMode = 'number' | 'rare' | 'often'

const SORTS: { v: SortMode; label: string }[] = [
  { v: 'number', label: 'Numer' },
  { v: 'rare',   label: 'Dawno' },
  { v: 'often',  label: 'Często' },
]

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function readSort(): SortMode {
  const v = localStorage.getItem(LS_SORT)
  return v === 'rare' || v === 'often' ? v : 'number'
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

// Podpowiedź zawężenia: ten sam wzorzec gestu, co wszędzie indziej
// (tap = dołącz, przytrzymanie = wyklucz), plus liczba pieśni, których dotyczy.
function SuggestTag({ name, count, onInc, onExc }: {
  name: string; count: number; onInc: () => void; onExc: () => void
}) {
  const lp = useLongPress(onInc, onExc)
  return (
    <button className="tag" {...lp}>
      {name} <span className="n">{count}</span>
    </button>
  )
}

// Znacznik statystyki przy pieśni — widoczny tylko w trybach statystycznych,
// bo w trybie „Numer" nic nie wnosi, a zabiera miejsce tytułowi.
function StatBadge({ mode, stat }: { mode: SortMode; stat: SongStat | undefined }) {
  if (mode === 'often') {
    return <span className={`song-stat${stat ? '' : ' never'}`}>{stat ? `${stat.count}×` : 'nigdy'}</span>
  }
  return (
    <span className={`song-stat${stat?.lastDate ? '' : ' never'}`}>
      {stat?.lastDate ? agoLabelPL(stat.lastDate) : 'nigdy'}
    </span>
  )
}

export function Songs() {
  const { openSong } = useSongOverlay()
  const [locationId] = useLocationFilter()
  const { data: songs = [] } = useAllSongsForSearch()
  const { data: collections = [] } = useCollections()
  const { data: allTags = [] } = useTags()
  const { data: tagCategories = [] } = useTagCategories()
  const { data: locations = [] } = useLocations()
  const todaySongs = useTodayServiceSongIds()
  const stats = useSongStats(locationId)

  const [q, setQ] = useState('')
  const [selColIds, setSelColIds] = useState<Set<string>>(() => readSet(LS_COLS))
  const [inc, setInc] = useState<Set<string>>(() => readSet(LS_INC))
  const [exc, setExc] = useState<Set<string>>(() => readSet(LS_EXC))
  const [sort, setSort] = useState<SortMode>(readSort)
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

  useEffect(() => {
    localStorage.setItem(LS_SORT, sort)
  }, [sort])

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

  // Wynik filtrowania (+ szukanie tekstem), jeszcze bez porządku wyświetlania.
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return tagFiltered
    return tagFiltered.filter(s =>
      s.title.toLowerCase().includes(n) ||
      (s.author ?? '').toLowerCase().includes(n) ||
      String(s.number).includes(n)
    )
  }, [tagFiltered, q])

  // Porządek wyświetlania. Domyślnie numer rosnąco (przy remisie wg kolekcji:
  // DP, KM, potem inne). W trybach statystycznych ten sam porządek jest
  // rozstrzygnięciem remisów, żeby lista nigdy nie „drgała" losowo.
  const sorted = useMemo(() => {
    const byNumber = (a: typeof filtered[number], b: typeof filtered[number]) =>
      compareSongs({ number: a.number, short: a.collection.short_name }, { number: b.number, short: b.collection.short_name })
    const arr = [...filtered]
    if (sort === 'often') {
      arr.sort((a, b) => (stats.get(b.id)?.count ?? 0) - (stats.get(a.id)?.count ?? 0) || byNumber(a, b))
    } else if (sort === 'rare') {
      // Nigdy niegrane mają pustą datę, a pusty łańcuch sortuje się przed każdą
      // datą ISO — trafiają więc na początek, dokładnie tam, gdzie mają być.
      arr.sort((a, b) => {
        const la = stats.get(a.id)?.lastDate ?? ''
        const lb = stats.get(b.id)?.lastDate ?? ''
        return la.localeCompare(lb) || byNumber(a, b)
      })
    } else {
      arr.sort(byNumber)
    }
    return arr
  }, [filtered, sort, stats])

  const songIds = useMemo(() => sorted.map(s => s.id), [sorted])

  // Tag IDs present in tagFiltered results (for sheet — collection+tag filter only)
  const presentTagIds = useMemo(() => {
    const set = new Set<string>()
    tagFiltered.forEach(s => s.tagIds.forEach(id => set.add(id)))
    inc.forEach(id => set.add(id))
    exc.forEach(id => set.add(id))
    return set
  }, [tagFiltered, inc, exc])

  const tagName = (id: string) => allTags.find(t => t.id === id)?.name ?? id

  /**
   * Podpowiedzi zawężenia: najczęstsze tagi WŚRÓD AKTUALNIE POKAZANYCH pieśni.
   * Wybór dowolnego z nich zawęża listę, a lista podpowiedzi przelicza się od
   * nowa — i tak w kółko, aż do kilku wyników.
   *
   * Liczymy to na kliencie, na danych, które ekran i tak ma w pamięci
   * (`useAllSongsForSearch` zwraca tagi każdej pieśni). Koszt to jedno przejście
   * po widocznych pieśniach — żadnego zapytania do bazy, więc nie ma czego
   * robić asynchronicznie ani odciążać.
   *
   * Odpadają: tagi już wybrane, tagi obecne przy KAŻDEJ pokazanej pieśni (nic
   * nie zawężają) i takie z jednym trafieniem (to już nie filtr, tylko pieśń).
   */
  const suggestions = useMemo(() => {
    if (filtered.length < 3) return []
    const counts = new Map<string, number>()
    for (const s of filtered) {
      for (const id of s.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const total = filtered.length
    return [...counts.entries()]
      .filter(([id, c]) => c > 1 && c < total && !inc.has(id) && !exc.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([id, c]) => ({ id, count: c, name: tagName(id) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, inc, exc, allTags])

  const activeFilters = [
    ...Array.from(inc).map(id => ({ id, kind: 'inc' as const })),
    ...Array.from(exc).map(id => ({ id, kind: 'exc' as const })),
  ]

  const plural = (n: number) => n === 1 ? 'pieśń' : 'pieśni'
  const hasTagFilter = inc.size > 0 || exc.size > 0
  const hasFilterSheet = hasTagFilter || selColIds.size > 0
  const hasAnyFilter = hasFilterSheet || q.trim() !== ''
  const locationName = locations.find(l => l.id === locationId)?.name

  return (
    <>
      <div className="screen" style={{ paddingTop: 0 }} ref={screenRef}>
        <div className="sticky-head" ref={headRef} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h1 className="t-title" style={{ fontSize: 26, margin: 0 }}>Pieśni</h1>
            <span className="count-line">
              Znaleziono <b>{sorted.length}</b> {plural(sorted.length)}
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
              aria-label="Filtry: zbiory i tagi"
              style={{ color: hasFilterSheet ? 'var(--accent)' : undefined }}
            >
              <Filter size={18} strokeWidth={1.7} />
            </button>
          </div>

          {/* porządek listy — „kiedy ostatnio" i „jak często" mieszkają tutaj,
              zamiast w widgetach na pulpicie: szuka się pieśni tam, gdzie są. */}
          <div className="seg seg-block">
            {SORTS.map(s => (
              <button key={s.v} className={sort === s.v ? 'on' : ''} onClick={() => setSort(s.v)}>
                {s.label}
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="hrow" style={{ marginTop: 10 }}>
              <span className="t-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'center' }}>
                <Sparkles size={12} strokeWidth={1.9} /> Zawęź
              </span>
              {suggestions.map(s => (
                <SuggestTag
                  key={s.id}
                  name={s.name}
                  count={s.count}
                  onInc={() => toggleInc(s.id)}
                  onExc={() => toggleExc(s.id)}
                />
              ))}
            </div>
          )}

          {hasAnyFilter && (
            <div className="pill-row" style={{ marginTop: 10 }}>
              {collections.filter(c => selColIds.has(c.id)).map(c => (
                <button key={c.id} className={`tag ${collectionClass(c.short_name)} on`} onClick={() => toggleCol(c.id)}>
                  {c.short_name} <X size={13} strokeWidth={2} />
                </button>
              ))}
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
          {sort !== 'number' && (
            <div className="hint" style={{ marginBottom: 8 }}>
              {sort === 'rare' ? 'Od najdawniej granych' : 'Od najczęściej granych'}
              {locationName ? ` · ${locationName}` : ' · wszystkie lokalizacje'}
            </div>
          )}
          <div className="card list-rows">
            {sorted.map(s => (
              <SongCard
                key={s.id}
                collection={s.collection.short_name}
                number={s.number}
                title={s.title}
                // W trybach statystycznych autor ustępuje miejsca znacznikowi:
                // liczy się „która pieśń i jak dawno", a tytuł ma się zmieścić w wierszu.
                author={sort === 'number' ? (s.author ?? '') : ''}
                songKey={s.original_key ?? undefined}
                minor={s.minor ?? false}
                showKey={sort === 'number'}
                right={sort === 'number' ? undefined : <StatBadge mode={sort} stat={stats.get(s.id)} />}
                mark={todaySongs.sung.has(s.id) ? 'sung' : todaySongs.planned.has(s.id) ? 'planned' : undefined}
                onClick={() => openSong(s.id, songIds)}
              />
            ))}
            {sorted.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)' }}>
                Brak wyników
              </div>
            )}
          </div>
        </div>

        {/* Suwak numerów ma sens tylko wtedy, gdy lista jest ułożona wg numeru. */}
        {sort === 'number' && sorted.length > SCRUBBER_THRESHOLD && (
          <Scrubber songs={sorted} scrollRef={screenRef} topOffset={headBottom} />
        )}
      </div>

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); setOpenCatId(null) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>Filtry</h2>
          <span className="count-line">{sorted.length} {plural(sorted.length)}</span>
        </div>

        {/* Zbiory — z paska nad listą przeniesione tutaj: w praktyce prawie
            nigdy się ich nie zmienia, a zajmowały stały wiersz na ekranie. */}
        <div style={{ marginBottom: 18 }}>
          <div className="t-label" style={{ marginBottom: 9 }}>Zbiory</div>
          <div className="pill-row">
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
        </div>

        <div className="t-label" style={{ marginBottom: 9 }}>Tagi</div>
        <div className="hint" style={{ marginBottom: 10 }}>Dotknij = dołącz · przytrzymaj = wyklucz</div>
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
