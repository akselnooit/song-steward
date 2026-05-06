import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

async function getDashboardData() {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const today = new Date().toISOString().slice(0, 10)

  const [songsCount, upcomingRes, pastRes, topSungRes, allSungRes] = await Promise.all([
    supabase.from('songs').select('*', { count: 'exact', head: true }),
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
      .gte('added_at', threeMonthsAgo.toISOString()),
    supabase
      .from('service_songs')
      .select('song_id, song:songs(id, title, number, collection:collections(short_name))')
      .eq('status', 'sung'),
  ])

  // Zlicz wystąpienia — top 5 ostatnie 3 miesiące
  type SongRef = { id: string; title: string; number: number; collection?: { short_name: string } }
  type CountMap = Record<string, { count: number; song: SongRef }>

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

  const topCounts = buildCounts((topSungRes.data || []) as unknown as { song_id: string; song: SongRef | SongRef[] }[])
  const allCounts = buildCounts((allSungRes.data || []) as unknown as { song_id: string; song: SongRef | SongRef[] }[])

  const topFive = Object.values(topCounts).sort((a, b) => b.count - a.count).slice(0, 5)
  const rarelyFive = Object.values(allCounts).sort((a, b) => a.count - b.count).slice(0, 5)

  const nearestService = upcomingRes.data ?? pastRes.data
  const isUpcoming = !!upcomingRes.data

  return {
    songsCount: songsCount.count || 0,
    nearestService,
    isUpcoming,
    topFive,
    rarelyFive,
  }
}

export default async function DashboardPage() {
  const { songsCount, nearestService, isUpcoming, topFive, rarelyFive } = await getDashboardData()

  const totalCount = nearestService?.service_songs?.length || 0
  const sungCount = nearestService?.service_songs?.filter(
    (ss: { status: string }) => ss.status === 'sung'
  ).length || 0

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Song Steward 🎵</h1>

      {/* Szybka akcja */}
      <Link
        href="/services/new"
        className="block w-full bg-blue-900 text-white text-center py-3.5 rounded-xl font-semibold text-lg mb-6 hover:bg-blue-800 active:bg-blue-700"
      >
        ＋ Nowe nabożeństwo
      </Link>

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-blue-900">{songsCount}</p>
          <p className="text-sm text-gray-500 mt-1">pieśni w bazie</p>
        </div>
        {nearestService ? (
          <Link href={`/services/${nearestService.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-blue-200">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              {isUpcoming ? 'Najbliższe nabożeństwo' : 'Ostatnie nabożeństwo'}
            </p>
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {new Date(nearestService.date).toLocaleDateString('pl-PL', {
                day: 'numeric', month: 'long',
              })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(nearestService.service_type as unknown as { name: string } | null)?.name || '—'}
            </p>
            {isUpcoming ? (
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

      {/* Top 5 najczęściej */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">🔥 Najczęściej śpiewane (3 mies.)</h2>
        {topFive.length === 0 ? (
          <p className="text-sm text-gray-400">Brak danych</p>
        ) : (
          <ol className="space-y-2">
            {topFive.map((item, i) => (
              <li key={item.song.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <Link href={`/songs/${item.song.id}`} className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1">
                  {item.song.title}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">{item.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Top 5 rzadko */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-700 mb-3">🌱 Rzadko śpiewane</h2>
        {rarelyFive.length === 0 ? (
          <p className="text-sm text-gray-400">Brak danych</p>
        ) : (
          <ol className="space-y-2">
            {rarelyFive.map((item, i) => (
              <li key={item.song.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <Link href={`/songs/${item.song.id}`} className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1">
                  {item.song.title}
                </Link>
                <span className="text-xs text-gray-400 shrink-0">{item.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
