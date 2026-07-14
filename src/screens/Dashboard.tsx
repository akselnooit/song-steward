import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, BarChart2, Clock, Filter, ChevronRight, Plus, User, CalendarDays, Dices } from 'lucide-react'
import { collectionClass } from '../lib/utils'
import { LocationChip } from '../components/ui'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { WaveformIcon } from '../components/WaveformIcon'
import { NewServiceSheet } from '../components/NewServiceSheet'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { useStatsFilters } from '../hooks/useStatsFilters'
import { useShake } from '../hooks/useShake'
import { vibrate } from '../lib/vibrate'
import {
  useServices, useServiceSongCounts, useTopSung, useNeverSung, usePendingTags, useLocations, useTags,
} from '../lib/queries'
import type { ServiceWithRefs, NeverSungRow } from '../lib/types'

// Losowa próbka n elementów (Fisher–Yates + slice). Math.random dozwolony w kodzie aplikacji.
function sample<T>(arr: readonly T[], n: number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// ── helpers ─────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDatePL(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── sub-components ───────────────────────────────────────────────

function TopRow({ rank, collectionShortName, number, title, count, onClick }: {
  rank?: number; collectionShortName: string; number: number; title: string; count?: number; onClick?: () => void
}) {
  return (
    <div className="song-card" style={{ cursor: 'pointer', padding: '13px 4px' }} onClick={onClick}>
      {rank != null && <span className="rank">{rank}</span>}
      <span className={`badge-col ${collectionClass(collectionShortName)}`} style={{ fontSize: 10, flexShrink: 0 }}>{collectionShortName} {number}</span>
      <div className="title" style={{ fontSize: 15, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {count != null && <span className="count-x">{count}×</span>}
    </div>
  )
}

function TodayCard({ service, isToday, songCount, onOpen }: {
  service: ServiceWithRefs; isToday: boolean; songCount: { sung: number; planned: number }; onOpen: () => void
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {isToday && (
          <span style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--r-pill)', letterSpacing: '0.02em' }}>DZIŚ</span>
        )}
        <span className="count-line">{formatDatePL(service.date)}</span>
      </div>
      <div className="t-title" style={{ fontSize: 21, marginBottom: 4 }}>
        {service.category.name} · {service.location.name}
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <User size={14} strokeWidth={1.7} />
        {service.leader?.name ?? '—'}
      </div>
      {isToday ? (
        // Dzisiejsze: zielony (akcent) przycisk ze wskaźnikiem „na żywo".
        <button className="btn btn-primary btn-block" onClick={onOpen}>
          <WaveformIcon size={17} /> Otwórz
        </button>
      ) : (
        // Przyszłe: neutralny „Otwórz", bez wskaźnika „na żywo".
        <button className="btn btn-ghost btn-block" onClick={onOpen}>
          Otwórz
        </button>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 13, color: 'var(--text-3)', fontSize: 12.5 }}>
        <span><b style={{ color: 'var(--text-2)' }}>{songCount.sung}</b> zaśpiewanych</span>
        <span><b style={{ color: 'var(--text-2)' }}>{songCount.planned}</b> zaplanowanych</span>
      </div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const { leader } = useCurrentUser()
  const { openSong } = useSongOverlay()
  const [locationId] = useLocationFilter()
  const [statsPrefs] = useStatsFilters()
  const [newServiceOpen, setNewServiceOpen] = useState(false)

  const statsFilters = { locationId, ...statsPrefs }

  const { data: services = [] } = useServices(locationId)
  const { data: topSung = [] } = useTopSung(statsFilters)
  // „Nigdy nieśpiewane": pobieramy większą pulę (kryteria/filtr bez zmian), a 5 pieśni
  // losujemy po stronie klienta — nowa próbka przy każdym wejściu i przy potrząśnięciu.
  const { data: neverSungPool } = useNeverSung(statsFilters, 1000)
  const [neverSung, setNeverSung] = useState<NeverSungRow[]>([])
  const rollNeverSung = useCallback(() => {
    if (neverSungPool) { setNeverSung(sample(neverSungPool, 5)); vibrate(30) }
  }, [neverSungPool])
  // Nowa próbka gdy pula się załaduje/zmieni (np. po zmianie filtra) oraz przy każdym montażu.
  useEffect(() => { if (neverSungPool) setNeverSung(sample(neverSungPool, 5)) }, [neverSungPool])
  const shake = useShake(rollNeverSung)
  const onDiceTap = () => {
    rollNeverSung()                 // ręczne „wylosuj ponownie" — działa zawsze (fallback)
    if (!shake.enabled) shake.enable() // pierwszy tap włącza też wykrywanie potrząśnięcia (zgoda iOS z gestu)
  }
  const { data: pendingTags = [] } = usePendingTags()
  const { data: locations = [] } = useLocations()
  const { data: allTags = [] } = useTags()

  const today = todayStr()
  const upcoming = [...services].sort((a, b) => a.date.localeCompare(b.date)).filter(s => s.date >= today)
  const featured = upcoming[0]
  const isToday = featured?.date === today

  const upcomingIds = useMemo(() => upcoming.map(s => s.id), [upcoming])
  const { data: songCounts = {} } = useServiceSongCounts(upcomingIds)
  const countFor = (id: string) => songCounts[id] ?? { sung: 0, planned: 0 }

  // Karuzel nadchodzących nabożeństw (gdy ≥2). Kropki pokazują aktywną kartę.
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const onCarouselScroll = () => {
    const el = carouselRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + 12 : el.clientWidth
    setActiveIdx(Math.max(0, Math.min(upcoming.length - 1, Math.round(el.scrollLeft / step))))
  }

  const locationName = locations.find(l => l.id === locationId)?.name
  const locSuffix = locationName ? ` · ${locationName}` : ''

  const topSungIds = useMemo(() => topSung.map(r => r.id), [topSung])
  const neverSungIds = useMemo(() => neverSung.map(r => r.id), [neverSung])

  const incIds = statsPrefs.tagIdsInclude ?? []
  const excIds = statsPrefs.tagIdsExclude ?? []
  const rangeText = statsPrefs.months ? `ostatnich ${statsPrefs.months} miesięcy` : 'całego okresu'
  const sentence = [
    `Statystyki dla ${locationName ? locationName : 'wszystkich lokalizacji'}, z ${rangeText}.`,
    incIds.length > 0 ? `Dołączone: ${allTags.filter(t => incIds.includes(t.id)).map(t => t.name).join(', ')}.` : '',
    excIds.length > 0 ? `Wykluczone: ${allTags.filter(t => excIds.includes(t.id)).map(t => t.name).join(', ')}.` : '',
  ].filter(Boolean).join(' ')

  const pendingCount = pendingTags.length

  return (
    <div className="screen">
      {/* header */}
      <div className="app-header">
        <div>
          <div className="sub" style={{ marginBottom: 2 }}>Dzień dobry</div>
          <h1>{leader?.name?.split(' ')[0] ?? '—'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LocationChip
            value={locationName}
            onClick={() => navigate('/settings', { state: { tab: 'filters', highlight: 'location' } })}
          />
          <div className="icon-btn" onClick={() => navigate('/settings')}>
            <Settings size={20} strokeWidth={1.7} />
          </div>
        </div>
      </div>

      <div className="screen-pad">
        {/* upcoming services: karuzel gdy ≥2, pojedyncza karta gdy 1 */}
        {upcoming.length >= 2 ? (
          <>
            <div className="svc-carousel" ref={carouselRef} onScroll={onCarouselScroll}>
              {upcoming.map(s => (
                <TodayCard
                  key={s.id}
                  service={s}
                  isToday={s.date === today}
                  songCount={countFor(s.id)}
                  onOpen={() => navigate(`/live/${s.id}`, { state: { navServiceIds: upcoming.map(u => u.id) } })}
                />
              ))}
            </div>
            <div className="svc-dots">
              {upcoming.map((_, i) => (
                <span key={i} className={`svc-dot${i === activeIdx ? ' on' : ''}`} />
              ))}
            </div>
          </>
        ) : featured ? (
          <TodayCard
            service={featured}
            isToday={isToday}
            songCount={countFor(featured.id)}
            onOpen={() => navigate(`/live/${featured.id}`)}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 4px', color: 'var(--text-3)', fontSize: 13.5 }}>
            <CalendarDays size={16} strokeWidth={1.5} style={{ flexShrink: 0, opacity: 0.55 }} />
            Brak nadchodzących nabożeństw
          </div>
        )}

        {/* moderation banner */}
        {pendingCount > 0 && (
          <div className="card" style={{ padding: '12px 14px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}
            onClick={() => navigate('/moderation')}>
            <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--src-user-soft)', color: 'var(--src-user)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Filter size={17} strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Moderacja tagów</div>
              <div className="count-line">{pendingCount} oczekujących zmian</div>
            </div>
            <span style={{ background: 'var(--src-user)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>
              {pendingCount}
            </span>
          </div>
        )}

        {/* new service button */}
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => setNewServiceOpen(true)}>
          <Plus size={18} strokeWidth={1.7} /> Nowe nabożeństwo
        </button>

        {/* top sung */}
        <div className="sec-h">
          <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart2 size={14} strokeWidth={1.7} />
            {'Najczęściej śpiewane' + locSuffix}
          </div>
        </div>
        <div className="card list-rows" style={{ padding: '4px 14px' }}>
          {topSung.length === 0
            ? <div style={{ padding: '14px 0', color: 'var(--text-3)', fontSize: 13 }}>Brak danych</div>
            : topSung.map((r, i) => (
              <TopRow key={r.id} rank={i + 1}
                collectionShortName={r.collection_short_name} number={r.number}
                title={r.title} count={r.sung_count}
                onClick={() => openSong(r.id, topSungIds)} />
            ))}
        </div>

        {/* never sung */}
        <div className="sec-h">
          <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Clock size={14} strokeWidth={1.7} />
            {'Nigdy nieśpiewane' + locSuffix}
          </div>
          <button
            className="link-btn"
            onClick={onDiceTap}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            title={shake.enabled ? 'Losuj ponownie (lub potrząśnij telefonem)' : 'Losuj ponownie — dotknij, by włączyć potrząsanie'}
          >
            <Dices size={16} strokeWidth={1.7} /> Losuj
          </button>
        </div>
        <div className="card list-rows" style={{ padding: '4px 14px' }}>
          {neverSung.length === 0
            ? <div style={{ padding: '14px 0', color: 'var(--text-3)', fontSize: 13 }}>Brak danych</div>
            : neverSung.map(r => (
              <TopRow key={r.id}
                collectionShortName={r.collection_short_name} number={r.number}
                title={r.title}
                onClick={() => openSong(r.id, neverSungIds)} />
            ))}
        </div>

        {/* filter summary */}
        <button className="filter-summary" onClick={() => navigate('/settings', { state: { tab: 'filters', highlight: 'stats-tags' } })}>
          <Filter size={15} strokeWidth={1.7} />
          <span>{sentence}</span>
          <span className="filter-summary-cta">
            Zmień <ChevronRight size={13} strokeWidth={1.7} />
          </span>
        </button>
      </div>

      <NewServiceSheet
        open={newServiceOpen}
        onClose={() => setNewServiceOpen(false)}
        defaultLeaderId={leader?.id}
      />
    </div>
  )
}
