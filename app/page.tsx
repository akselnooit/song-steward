import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

type SongRef = { id: string; title: string; number: number; collection?: { short_name: string } }
type CountMap = Record<string, { count: number; song: SongRef }>

const COLLECTION_ORDER: Record<string, number> = { DP: 0, KM: 1, NDP: 2, NKM: 3, SOS: 4 }

const buildCounts = (rows: { song_id: string; song: SongRef | SongRef[] }[]): CountMap => {
  const map: CountMap = {}
  rows.forEach((ss) => {
    const song = Array.isArray(ss.song) ? ss.song[0] : ss.song
    if (!song) return
    if (!map[ss.song_id]) map[ss.song_id] = { count: 0, song }
    map[ss.song_id].count++
  })
  return map
}

async function getDashboardData() {
  const today = new Date().toISOString().slice(0, 10)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  const [
    songsCount,
    songsWithCollections,
    upcomingRes,
    pastRes,
    topSungRes,
    allSungIdsRes,
    startTagRes,
  ] = await Promise.all([
    supabase.from('songs').select('*', { count: 'exact', head: true }),
    supabase.from('songs').select('collection:collections(short_name)'),
    supabase
      .from('services')
      .select('id, date, service_type:service_types(name), service_songs(id, status)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('services')
      .select('id, date, service_type:service_types(name), service_songs(id, status)')
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('service_songs')
      .select('song_id, song:songs(id, title, number, collection:collections(short_name))')
      .eq('status', 'sung')
      .gte('added_at', twelveMonthsAgo.toISOString()),
    supabase.from('service_songs').select('song_id').eq('status', 'sung'),
    supabase.from('tags').select('id').eq('name', 'Rozpoczęcie').maybeSingle(),
  ])

  // Zlicz pieśni per kolekcja
  type CollRow = { collection: { short_name: string } | null }
  const collMap: Record<string, number> = {}
  for (const row of (songsWithCollections.data || []) as unknown as CollRow[]) {
    const name = row.collection?.short_name || '?'
    collMap[name] = (collMap[name] || 0) + 1
  }
  const collectionCounts = Object.entries(collMap)
    .sort(([a], [b]) => (COLLECTION_ORDER[a] ?? 99) - (COLLECTION_ORDER[b] ?? 99))

  // Top 5 najczęściej śpiewanych (12 miesięcy)
  const topCounts = buildCounts((topSungRes.data || []) as unknown as { song_id: string; song: SongRef | SongRef[] }[])
  const topFive = Object.values(topCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  // Nigdy nie śpiewane z tagiem "Rozpoczęcie"
  const sungIds = new Set((allSungIdsRes.data || []).map((s) => s.song_id))
  const tagId = startTagRes.data?.id
  let neverSungStarters: SongRef[] = []
  if (tagId) {
    const { data: songTagData } = await supabase
      .from('song_tags')
      .select('song_id, song:songs(id, title, number, collection:collections(short_name))')
      .eq('tag_id', tagId)
    neverSungStarters = ((songTagData || []) as unknown as { song_id: string; song: SongRef | SongRef[] }[])
      .filter((st) => !sungIds.has(st.song_id))
      .map((st) => (Array.isArray(st.song) ? st.song[0] : st.song))
      .filter(Boolean)
      .sort((a, b) => {
        const ao = COLLECTION_ORDER[a!.collection?.short_name ?? ''] ?? 99
        const bo = COLLECTION_ORDER[b!.collection?.short_name ?? ''] ?? 99
        if (ao !== bo) return ao - bo
        return (a!.number ?? 0) - (b!.number ?? 0)
      })
      .slice(0, 5) as SongRef[]
  }

  // Status nabożeństwa
  const nearestService = upcomingRes.data ?? pastRes.data
  const serviceStatus: 'today' | 'future' | 'past' =
    upcomingRes.data?.date === today ? 'today' :
    upcomingRes.data ? 'future' : 'past'

  return { songsCount: songsCount.count || 0, collectionCounts, nearestService, serviceStatus, topFive, neverSungStarters }
}

export default async function DashboardPage() {
  const { songsCount, collectionCounts, nearestService, serviceStatus, topFive, neverSungStarters } = await getDashboardData()

  const totalCount = nearestService?.service_songs?.length || 0
  const sungCount = nearestService?.service_songs?.filter(
    (ss: { status: string }) => ss.status === 'sung'
  ).length || 0

  const serviceLabel =
    serviceStatus === 'today' ? 'Dzisiejsze nabożeństwo' :
    serviceStatus === 'future' ? 'Następne nabożeństwo' :
    'Ostatnie nabożeństwo'

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Song Steward 🎵</h1>

      {/* Szybka akcja */}
      <Link
        href="/services/new"
        className="block w-full bg-blue-900 text-white text-center py-3.5 rounded-xl font-semibold text-lg mb-6 hover:bg-blue-800 active:bg-blue-700 active:scale-[0.98] transition-all"
      >
        ＋ Nowe nabożeństwo
      </Link>

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-blue-900">{songsCount}</p>
          <p className="text-sm text-gray-500 mt-1">pieśni w bazie</p>
          {collectionCounts.length > 0 && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              {collectionCounts.map(([name, count]) => `${name} ${count}`).join(' · ')}
            </p>
          )}
        </div>
        {nearestService ? (
          <Link href={`/services/${nearestService.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md active:scale-[0.98] transition-all">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              {serviceLabel}
            </p>
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {new Date(nearestService.date).toLocaleDateString('pl-PL', {
                day: 'numeric', month: 'long',
              })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(nearestService.service_type as unknown as { name: string } | null)?.name || '—'}
            </p>
            {serviceStatus === 'future' || serviceStatus === 'today' ? (
              <p className="text-xs text-blue-600 font-semibold mt-1">{totalCount} pieśni</p>
            ) : (
              <p className="text-xs text-green-600 font-semibold mt-1">{sungCount} zaśpiewanych</p>
            )}
          </Link>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center">Brak nabożeństw</p>
          </div>
        )}
      </div>

      {/* Top 5 najczęściej (12 miesięcy) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">🔥 Najczęściej śpiewane (12 mies.)</h2>
        {topFive.length === 0 ? (
          <p className="text-sm text-gray-400">Brak danych</p>
        ) : (
          <ol className="space-y-2">
            {topFive.map((item, i) => (
              <li key={item.song.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <Link href={`/songs/${item.song.id}`} className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1">
                  <span className="font-semibold text-gray-500 mr-1">{item.song.number}</span>
                  {item.song.title}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">{item.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Nigdy nie śpiewane z tagiem Rozpoczęcie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-700 mb-3">
          🌱 Jeszcze nie śpiewane
          <span className="text-xs font-normal text-gray-400 ml-1">(tag: Rozpoczęcie)</span>
        </h2>
        {neverSungStarters.length === 0 ? (
          <p className="text-sm text-gray-400">Wszystkie zaśpiewane 🎉</p>
        ) : (
          <ol className="space-y-2">
            {neverSungStarters.map((song, i) => (
              <li key={song.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <Link href={`/songs/${song.id}`} className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1">
                  <span className="font-semibold text-gray-500 mr-1">{song.number}</span>
                  {song.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* TODO: lepsze statystyki śpiewanych pieśni — naciśnięcie na kafelek otwiera osobną stronę ze statystykami */}
    </div>
  )
}
