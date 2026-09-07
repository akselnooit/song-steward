import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Filter, Plus, User, CalendarDays, ArrowRight, History, BarChart2 } from 'lucide-react'
import { LocationChip } from '../components/ui'
import { WaveformIcon } from '../components/WaveformIcon'
import { NewServiceSheet } from '../components/NewServiceSheet'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useLocationFilter } from '../hooks/useLocationFilter'
import { useSongOverlay } from '../contexts/SongOverlayContext'
import { collectionClass } from '../lib/utils'
import { useServices, useServiceSongCounts, usePendingTags, useLocations, useTopSung } from '../lib/queries'
import type { ServiceWithRefs } from '../lib/types'
import {
  compareServices, formatDatePL, formatTimePL, relativeDayPL, shortDatePL, todayStr,
} from '../lib/dates'

// ── helpers ─────────────────────────────────────────────────────

// „pieśń" ma tę wygodną cechę, że mianownik i dopełniacz liczby mnogiej brzmią
// tak samo („2 pieśni", „5 pieśni"), więc odrębny jest tylko przypadek 1.
const piesni = (n: number) => (n === 1 ? 'pieśń' : 'pieśni')

// ── sub-components ───────────────────────────────────────────────

// Wiersz listy „Najczęściej śpiewane": miejsce → odznaka zbioru → tytuł → licznik.
function TopRow({ rank, collectionShortName, number, title, count, onClick }: {
  rank: number; collectionShortName: string; number: number; title: string; count: number; onClick: () => void
}) {
  return (
    <div className="song-card" style={{ cursor: 'pointer', padding: '13px 4px' }} onClick={onClick}>
      <span className="rank">{rank}</span>
      <span className={`badge-col ${collectionClass(collectionShortName)}`} style={{ fontSize: 10, flexShrink: 0 }}>{collectionShortName} {number}</span>
      <div className="title" style={{ fontSize: 15, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      <span className="count-x">{count}×</span>
    </div>
  )
}

// Kafelek zakończonego nabożeństwa — czyta się od góry: kiedy → co → ile.
// Lokalizację pokazujemy tylko przy wyłączonym globalnym filtrze, bo inaczej
// powtarzałaby to, co widać w chipie w nagłówku ekranu.
function PastServiceTile({ service, sung, leftover, showLocation, onClick }: {
  service: ServiceWithRefs; sung: number; leftover: number; showLocation: boolean; onClick: () => void
}) {
  return (
    <button className="past-tile" onClick={onClick}>
      {leftover > 0 && (
        <span
          className="past-dot"
          title={`Zostały nieodhaczone pieśni: ${leftover}`}
          aria-label={`Zostały nieodhaczone pieśni: ${leftover}`}
        />
      )}
      <span className="past-when">{relativeDayPL(service.date)}</span>
      <span className="past-date t-mono">{shortDatePL(service.date)} · {formatTimePL(service.start_time)}</span>
      <span className="past-what">{service.category.name}</span>
      {showLocation && <span className="past-where">{service.location.name}</span>}
      <span className="past-count"><b>{sung}</b> {piesni(sung)}</span>
    </button>
  )
}

// Ostatni element paska — wejście do pełnej listy nabożeństw. Ten sam rozmiar
// i kształt co kafelki (współdzielona klasa `.past-tile`), ale przerywany obrys
// i wyśrodkowana treść: to akcja, nie zapis nabożeństwa.
function PastMoreTile({ onClick }: { onClick: () => void }) {
  return (
    <button className="past-tile past-more" onClick={onClick}
      aria-label="Zobacz wszystkie nabożeństwa">
      <span className="past-more-ico"><ArrowRight size={17} strokeWidth={1.9} /></span>
      Więcej
    </button>
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
        <span className="count-line">{formatDatePL(service.date)} · {formatTimePL(service.start_time)}</span>
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
  const [newServiceOpen, setNewServiceOpen] = useState(false)

  const { data: services = [] } = useServices(locationId)
  const { data: pendingTags = [] } = usePendingTags()
  const { data: locations = [] } = useLocations()
  const { data: topSung = [] } = useTopSung(locationId)

  const today = todayStr()
  // Nadchodzące = od dziś włącznie, chronologicznie (data, przy remisie godzina).
  // Godzina świadomie NIE decyduje o tym, czy nabożeństwo jest „nadchodzące":
  // dzisiejsze zostaje na górze pulpitu do końca dnia, żeby po porannym
  // nabożeństwie dopisanie pieśni czy notatki było jednym tapnięciem.
  const upcoming = [...services].sort(compareServices).filter(s => s.date >= today)
  const featured = upcoming[0]
  const isToday = featured?.date === today

  // Zakończone = data wcześniejsza niż dziś (nabożeństwo nie ma godziny końca),
  // od najnowszego. Ograniczone do 10 — w pasku 3 kafelków dalsze przewijanie
  // traci sens, od tego jest kafelek „Więcej" na końcu paska.
  const past = useMemo(
    () => services.filter(s => s.date < today).sort((a, b) => compareServices(b, a)).slice(0, 10),
    [services, today],
  )

  const upcomingIds = useMemo(() => upcoming.map(s => s.id), [upcoming])
  const pastIds = useMemo(() => past.map(s => s.id), [past])
  // Jedno zapytanie na oba zestawy — klucz i tak sortuje id, więc cache trzyma.
  const countedIds = useMemo(() => [...upcomingIds, ...pastIds], [upcomingIds, pastIds])
  const { data: songCounts = {} } = useServiceSongCounts(countedIds)
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
  const pendingCount = pendingTags.length
  const topSungIds = useMemo(() => topSung.map(r => r.id), [topSung])

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
            {locationName ? `Brak nadchodzących nabożeństw w: ${locationName}` : 'Brak nadchodzących nabożeństw'}
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

        {/* ostatnio odbyte — poziomy pasek kafelków, 3 widoczne + skrawek */}
        {past.length > 0 && (
          <>
            <div className="sec-h">
              <div className="t-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <History size={14} strokeWidth={1.7} />
                Ostatnio odbyte
              </div>
            </div>
            <div className="past-strip">
              {past.map(s => {
                const c = countFor(s.id)
                return (
                  <PastServiceTile
                    key={s.id}
                    service={s}
                    sung={c.sung}
                    leftover={c.planned}
                    showLocation={!locationId}
                    onClick={() => navigate(`/live/${s.id}`)}
                  />
                )
              })}
              <PastMoreTile onClick={() => navigate('/services')} />
            </div>
          </>
        )}

        {/* najczęściej śpiewane — w zakresie globalnego filtra lokalizacji.
            Bez własnych filtrów: „jak dawno" i węższe kryteria mieszkają teraz
            na ekranie „Pieśni", tutaj zostaje sam ranking. */}
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
      </div>

      <NewServiceSheet
        open={newServiceOpen}
        onClose={() => setNewServiceOpen(false)}
        defaultLeaderId={leader?.id}
      />
    </div>
  )
}
