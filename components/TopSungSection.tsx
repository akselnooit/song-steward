'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSongOverlay } from '@/contexts/SongOverlayContext'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet } from '@/lib/cache'
import { useTopSungFilters } from '@/lib/useFilters'
import { useGlobalLocation } from '@/lib/useGlobalLocation'
import type { WorshipLeader } from '@/lib/types'

type SongRef = { id: string; title: string; number: number; collection?: { short_name: string } }
type Entry = {
  song_id: string
  song: SongRef | SongRef[]
  service: {
    location_id: string | null
    category_id: string | null
    worship_leader_id: string | null
  } | null
}

function cutoffDate(timeRange: string): string | null {
  if (timeRange === 'all') return null
  const d = new Date()
  if (timeRange === '1m') d.setMonth(d.getMonth() - 1)
  else if (timeRange === '3m') d.setMonth(d.getMonth() - 3)
  else if (timeRange === '6m') d.setMonth(d.getMonth() - 6)
  else if (timeRange === '12m') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString()
}

const TIME_RANGE_LABELS: Record<string, string> = {
  '1m': 'ostatni miesiąc',
  '3m': 'ostatnie 3 mies.',
  '6m': 'ostatnie 6 mies.',
  '12m': 'ostatnie 12 mies.',
}

export default function TopSungSection() {
  const { openSong } = useSongOverlay()
  const { filters } = useTopSungFilters()
  const { locationId } = useGlobalLocation()
  const [entries, setEntries] = useState<Entry[]>([])
  const [leaders, setLeaders] = useState<WorshipLeader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      let query = supabase
        .from('service_songs')
        .select('song_id, song:songs(id, title, number, collection:collections(short_name)), service:services(location_id, category_id, worship_leader_id)')
        .eq('status', 'sung')

      const cutoff = cutoffDate(filters.timeRange)
      if (cutoff) query = query.gte('added_at', cutoff)

      const [ssResult, leadersData] = await Promise.all([
        query,
        cacheGet<WorshipLeader[]>('worship_leaders') ??
          fetch('/api/worship-leaders').then((r) => r.json()).then((d) => { cacheSet('worship_leaders', d); return d }),
      ])

      setEntries((ssResult.data || []) as unknown as Entry[])
      setLeaders(leadersData)
      setLoading(false)
    }
    init()
  // Re-run when filters.timeRange changes (other filters applied client-side)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.timeRange])

  const topFive = useMemo(() => {
    const filtered = entries.filter((e) => {
      const svc = Array.isArray(e.service) ? e.service[0] : e.service
      if (locationId && svc?.location_id !== locationId) return false
      if (filters.leaderIds.length > 0 && !filters.leaderIds.includes(svc?.worship_leader_id ?? '')) return false
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(svc?.category_id ?? '')) return false
      return true
    })

    const counts: Record<string, { count: number; song: SongRef }> = {}
    filtered.forEach((e) => {
      const song = Array.isArray(e.song) ? e.song[0] : e.song
      if (!song) return
      if (!counts[e.song_id]) counts[e.song_id] = { count: 0, song }
      counts[e.song_id].count++
    })

    // Apply tag filter (AND): song must have ALL selected tag ids
    // Note: service_songs doesn't carry song_tags here; this filter is best-effort
    // (full tag filtering would require a separate data fetch)
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [entries, locationId, filters.leaderIds, filters.categoryIds])

  const subtitle = useMemo(() => {
    const parts: string[] = []

    if (locationId) {
      // We don't have location name here — would need to pass from parent or fetch
      // Use a minimal label
      parts.push('Wybrana lokalizacja')
    }

    const leaderNames = filters.leaderIds
      .map((id) => leaders.find((l) => l.id === id)?.name.split(' ')[0])
      .filter(Boolean) as string[]
    if (leaderNames.length > 0) parts.push(leaderNames.join(', '))

    if (filters.timeRange !== 'all') parts.push(TIME_RANGE_LABELS[filters.timeRange] || '')

    if (parts.length === 0) return 'Wszystkie nabożeństwa'
    return parts.join(' · ')
  }, [locationId, filters.leaderIds, filters.timeRange, leaders])

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-32 animate-pulse mb-4" />

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-700">Najczęściej śpiewane</h2>
      </div>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
      {topFive.length === 0 ? (
        <p className="text-sm text-gray-400">Brak danych</p>
      ) : (
        <ol className="space-y-2">
          {topFive.map((item, i) => (
            <li key={item.song.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
              <button
                className="flex-1 text-sm text-gray-900 hover:text-blue-900 line-clamp-1 text-left"
                onClick={() => openSong(item.song.id, topFive.map((t) => t.song.id))}
              >
                <span className="font-semibold text-gray-500 mr-1">{item.song.number}</span>
                {item.song.title}
              </button>
              <span className="text-xs text-gray-400 shrink-0">{item.count}×</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
