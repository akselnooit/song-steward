import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom'
import { ArrowLeft, Filter, ChevronRight, MapPin, Layers, User, Music, Tag, Bookmark, Plus, X, Sun, Moon, Check, Mail, Lock } from 'lucide-react'
import { CatBlock, Sheet } from '../components/ui'
import { useLongPress } from '../hooks/useLongPress'
import { useTheme } from '../hooks/useTheme'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { useStatsFilters } from '../hooks/useStatsFilters'
import { supabase } from '../lib/supabase'
import {
  useLocations, useServiceCategories, useWorshipLeaders, useCollections,
  useTagCategories, useTags, usePendingTags,
  useAddLocation, useDeleteLocation,
  useAddServiceCategory, useDeleteServiceCategory,
  useAddWorshipLeader, useDeleteWorshipLeader,
  useAddTag, useDeleteTag,
} from '../lib/queries'

// ── DictEditor Sheet ─────────────────────────────────────────────

type DictKey = 'locations' | 'service_categories' | 'worship_leaders' | 'collections' | 'tag_categories' | 'tags'

interface DictConfig {
  key: DictKey
  label: string
  icon: React.ReactNode
  sub: string
  readonly?: boolean
}

const DICTS: DictConfig[] = [
  { key: 'locations',         label: 'Lokalizacje',          icon: <MapPin size={17} strokeWidth={1.7} />,  sub: 'Miejsca nabożeństw' },
  { key: 'service_categories',label: 'Kategorie nabożeństw', icon: <Layers size={17} strokeWidth={1.7} />,  sub: 'Typy wydarzeń' },
  { key: 'worship_leaders',   label: 'Prowadzący muzykę',    icon: <User size={17} strokeWidth={1.7} />,    sub: 'Powiązani z kontami' },
  { key: 'collections',       label: 'Zbiory pieśni',        icon: <Music size={17} strokeWidth={1.7} />,   sub: 'Śpiewniki i skróty', readonly: true },
  { key: 'tag_categories',    label: 'Kategorie tagów',      icon: <Tag size={17} strokeWidth={1.7} />,     sub: 'Z flagą edytowalności', readonly: true },
  { key: 'tags',              label: 'Tagi',                 icon: <Bookmark size={17} strokeWidth={1.7} />,sub: 'Wszystkie etykiety' },
]

function DictEditorSheet({ dict, open, onClose }: { dict: DictConfig; open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState('')
  const { data: locations = [] } = useLocations()
  const { data: svcCats = [] } = useServiceCategories()
  const { data: leaders = [] } = useWorshipLeaders()
  const { data: collections = [] } = useCollections()
  const { data: tagCats = [] } = useTagCategories()
  const { data: tags = [] } = useTags()
  const addLoc = useAddLocation()
  const delLoc = useDeleteLocation()
  const addCat = useAddServiceCategory()
  const delCat = useDeleteServiceCategory()
  const addLeader = useAddWorshipLeader()
  const delLeader = useDeleteWorshipLeader()
  const addTag = useAddTag()
  const delTag = useDeleteTag()
  const [tagCatId, setTagCatId] = useState('')

  const items: { id: string; name: string; sub?: string }[] = (() => {
    switch (dict.key) {
      case 'locations': return locations
      case 'service_categories': return svcCats
      case 'worship_leaders': return leaders.map(l => ({ ...l, sub: l.email ?? 'Gość — brak konta' }))
      case 'collections': return collections.map(c => ({ ...c, name: `${c.short_name} — ${c.name}` }))
      case 'tag_categories': return tagCats.map(c => ({ ...c, sub: c.user_editable ? 'edytowalna' : 'tylko odczyt' }))
      case 'tags': return tags.filter(t => !tagCatId || t.category_id === tagCatId)
      default: return []
    }
  })()

  const handleAdd = async () => {
    if (!draft.trim()) return
    switch (dict.key) {
      case 'locations': await addLoc.mutateAsync(draft.trim()); break
      case 'service_categories': await addCat.mutateAsync(draft.trim()); break
      case 'worship_leaders': await addLeader.mutateAsync(draft.trim()); break
      case 'tags': if (tagCatId) await addTag.mutateAsync({ name: draft.trim(), category_id: tagCatId }); break
    }
    setDraft('')
  }

  const handleDelete = async (id: string) => {
    switch (dict.key) {
      case 'locations': await delLoc.mutateAsync(id); break
      case 'service_categories': await delCat.mutateAsync(id); break
      case 'worship_leaders': await delLeader.mutateAsync(id); break
      case 'tags': await delTag.mutateAsync(id); break
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="t-title" style={{ fontSize: 20, margin: 0 }}>{dict.label}</h2>
        <span className="count-line">{items.length} pozycji</span>
      </div>

      {dict.key === 'tags' && (
        <div className="hrow" style={{ marginBottom: 12 }}>
          {tagCats.map(c => (
            <button key={c.id} className={`tag${tagCatId === c.id ? ' include' : ''}`} onClick={() => setTagCatId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!dict.readonly && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div className="field-wrap" style={{ flex: 1 }}>
            <span className="field-ico"><Plus size={18} strokeWidth={1.7} /></span>
            <input
              className="field"
              placeholder={`Dodaj: ${dict.label.toLowerCase()}`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            />
          </div>
          <button className="btn btn-primary" onClick={handleAdd} style={{ minWidth: 60 }}>Dodaj</button>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="list-rows">
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--text)' }}>{it.name}</div>
                {it.sub && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {dict.key === 'worship_leaders' && it.sub !== 'Gość — brak konta' && <Mail size={11} strokeWidth={1.7} />}
                    {dict.key === 'tag_categories' && it.sub === 'tylko odczyt' && <Lock size={11} strokeWidth={1.7} />}
                    {it.sub}
                  </div>
                )}
              </div>
              {!dict.readonly && (
                <button className="mini-btn" onClick={() => handleDelete(it.id)}>
                  <X size={15} strokeWidth={1.7} />
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              Brak pozycji
            </div>
          )}
        </div>
      </div>
      {dict.readonly && (
        <div className="hint" style={{ marginTop: 10, justifyContent: 'center' }}>
          Ten słownik jest zarządzany przez administratora systemu
        </div>
      )}
    </Sheet>
  )
}

// ── Stats tag toggle with long-press ────────────────────────────

function StatTag({ name, inc, exc, onInc, onExc }: { name: string; inc: boolean; exc: boolean; onInc: () => void; onExc: () => void }) {
  const lp = useLongPress(onInc, onExc)
  return (
    <button className={`tag${inc ? ' include' : exc ? ' exclude' : ''}`} {...lp}>{name}</button>
  )
}

// ── Settings screen ──────────────────────────────────────────────

export function Settings() {
  const navigate = useNavigate()
  const routerLoc = useRouterLocation()
  const routerState = routerLoc.state as { tab?: string; highlight?: string } | null
  const [tab, setTab] = useState<'dict' | 'filters'>(routerState?.tab === 'filters' ? 'filters' : 'dict')
  const [locHighlight, setLocHighlight] = useState(routerState?.highlight === 'location')
  const locSectionRef = useRef<HTMLDivElement>(null)
  const [statsTagsHighlight, setStatsTagsHighlight] = useState(routerState?.highlight === 'stats-tags')
  const statsTagsSectionRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<DictConfig | null>(null)

  useEffect(() => {
    if (!locHighlight) return
    locSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setLocHighlight(false), 2200)
    return () => clearTimeout(t)
  }, [locHighlight])

  useEffect(() => {
    if (!statsTagsHighlight) return
    statsTagsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setStatsTagsHighlight(false), 2200)
    return () => clearTimeout(t)
  }, [statsTagsHighlight])
  const [theme, setTheme] = useTheme()
  const [locationId, setLocationId] = useLocationFilter()
  const [statsPrefs, setStatsPrefs] = useStatsFilters()
  const { data: pendingTags = [] } = usePendingTags()
  const { data: locations = [] } = useLocations()
  const { data: leaders = [] } = useWorshipLeaders()
  const { data: tagCategories = [] } = useTagCategories()
  const { data: allTags = [] } = useTags()

  const pendingCount = pendingTags.length

  const toggleStatTag = (tagId: string, kind: 'inc' | 'exc') => {
    const inc = statsPrefs.tagIdsInclude ?? []
    const exc = statsPrefs.tagIdsExclude ?? []
    if (kind === 'inc') {
      setStatsPrefs({ ...statsPrefs, tagIdsInclude: inc.includes(tagId) ? inc.filter(x => x !== tagId) : [...inc, tagId], tagIdsExclude: exc.filter(x => x !== tagId) })
    } else {
      setStatsPrefs({ ...statsPrefs, tagIdsExclude: exc.includes(tagId) ? exc.filter(x => x !== tagId) : [...exc, tagId], tagIdsInclude: inc.filter(x => x !== tagId) })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const incIds = statsPrefs.tagIdsInclude ?? []
  const excIds = statsPrefs.tagIdsExclude ?? []

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div style={{ padding: '52px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={19} strokeWidth={1.7} />
          </button>
          <h1 className="t-title" style={{ fontSize: 24, margin: 0 }}>Ustawienia</h1>
        </div>
        <div className="seg" style={{ width: '100%' }}>
          <button className={tab === 'dict' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('dict')}>Zarządzanie</button>
          <button className={tab === 'filters' ? 'on' : ''} style={{ flex: 1 }} onClick={() => setTab('filters')}>Preferencje</button>
        </div>
      </div>

      <div className="screen-pad" style={{ paddingTop: 16 }}>
        {tab === 'dict' ? (
          <>
            {/* moderation entry */}
            <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => navigate('/moderation')}>
              <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--src-user-soft)', color: 'var(--src-user)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Filter size={19} strokeWidth={1.7} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Panel moderacji</div>
                <div className="count-line">Oczekujące zmiany w tagach</div>
              </div>
              {pendingCount > 0 && (
                <span style={{ background: 'var(--src-user)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>
                  {pendingCount}
                </span>
              )}
              <ChevronRight size={16} strokeWidth={1.7} style={{ color: 'var(--text-3)' }} />
            </div>

            {/* dictionaries */}
            <div className="t-label" style={{ marginBottom: 10 }}>Słowniki danych</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="list-rows">
                {DICTS.map(d => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer' }}
                    onClick={() => setEditor(d)}>
                    <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {d.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{d.label}</div>
                      <div className="count-line">{d.sub}</div>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.7} style={{ color: 'var(--text-3)' }} />
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-ghost btn-block" style={{ marginTop: 18 }} onClick={handleLogout}>
              Wyloguj się
            </button>
          </>
        ) : (
          <>
            {/* theme */}
            <div className="t-label" style={{ marginBottom: 10 }}>Wygląd</div>
            <div className="theme-pick" style={{ marginBottom: 22 }}>
              {[{ v: 'light' as const, label: 'Jasny', icon: <Sun size={18} strokeWidth={1.7} /> },
                { v: 'dark' as const, label: 'Ciemny', icon: <Moon size={18} strokeWidth={1.7} /> }].map(opt => (
                <button key={opt.v} className={`theme-opt${theme === opt.v ? ' on' : ''}`} onClick={() => setTheme(opt.v)}>
                  {opt.icon} {opt.label}
                  {theme === opt.v && <Check size={15} strokeWidth={1.7} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>

            {/* location filter */}
            <div ref={locSectionRef} className={locHighlight ? 'section-highlight' : ''} style={{ marginBottom: 22 }}>
              <div className="t-label" style={{ marginBottom: 9 }}>Globalny filtr lokalizacji</div>
              <div className="pill-row" style={{ marginBottom: 6 }}>
                <button className={`tag${!locationId ? ' include' : ''}`} onClick={() => setLocationId(undefined)}>
                  Wszystkie
                </button>
                {locations.map(l => (
                  <button key={l.id} className={`tag${locationId === l.id ? ' include' : ''}`} onClick={() => setLocationId(l.id)}>
                    {l.name}
                  </button>
                ))}
              </div>
              <div className="hint">Wpływa na pulpit, listę nabożeństw i statystyki.</div>
            </div>

            {/* stats filters */}
            <div className="t-label" style={{ marginBottom: 9 }}>Domyślne filtry statystyk</div>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <div className="count-line" style={{ marginBottom: 8 }}>Prowadzący muzykę</div>
                <div className="pill-row">
                  <button className={`tag${!statsPrefs.leaderId ? ' include' : ''}`} onClick={() => setStatsPrefs({ ...statsPrefs, leaderId: undefined })}>
                    Wszyscy
                  </button>
                  {leaders.map(l => (
                    <button key={l.id} className={`tag${statsPrefs.leaderId === l.id ? ' include' : ''}`} onClick={() => setStatsPrefs({ ...statsPrefs, leaderId: l.id })}>
                      {l.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="count-line" style={{ marginBottom: 8 }}>Zakres czasu</div>
                <div className="pill-row">
                  {[{ label: '3 mies.', v: 3 }, { label: '6 mies.', v: 6 }, { label: '12 mies.', v: 12 }, { label: 'Cały czas', v: undefined }].map(r => (
                    <button key={r.label} className={`tag${statsPrefs.months === r.v ? ' include' : ''}`} onClick={() => setStatsPrefs({ ...statsPrefs, months: r.v })}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* stats tag filters */}
            <div ref={statsTagsSectionRef} className={statsTagsHighlight ? 'section-highlight' : ''} style={{ marginBottom: 0 }}>
            <div className="sec-h" style={{ marginTop: 0, marginBottom: 4 }}>
              <div className="t-label">Tagi statystyk</div>
              {(incIds.length > 0 || excIds.length > 0) && (
                <button className="link-btn" onClick={() => setStatsPrefs({ ...statsPrefs, tagIdsInclude: [], tagIdsExclude: [] })}>Wyczyść</button>
              )}
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>Dotknij = dołącz · przytrzymaj = wyklucz</div>
            <div className="card" style={{ padding: '2px 16px 8px', marginBottom: 22 }}>
              {tagCategories.map(cat => {
                const catTags = allTags.filter(t => t.category_id === cat.id)
                const selectedCount = catTags.filter(t => incIds.includes(t.id) || excIds.includes(t.id)).length
                return (
                  <CatBlock key={cat.id} name={cat.name} count={catTags.length} selectedCount={selectedCount} defaultOpen={false}>
                    {catTags.map(tag => (
                      <StatTag
                        key={tag.id}
                        name={tag.name}
                        inc={incIds.includes(tag.id)}
                        exc={excIds.includes(tag.id)}
                        onInc={() => toggleStatTag(tag.id, 'inc')}
                        onExc={() => toggleStatTag(tag.id, 'exc')}
                      />
                    ))}
                  </CatBlock>
                )
              })}
            </div>
            </div>

            <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="count-line">Wersja aplikacji</span>
              <span className="t-mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>v2.0</span>
            </div>
          </>
        )}
      </div>

      {editor && (
        <DictEditorSheet dict={editor} open={!!editor} onClose={() => setEditor(null)} />
      )}
    </div>
  )
}
